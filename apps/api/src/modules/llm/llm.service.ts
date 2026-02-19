import { Injectable, Logger } from '@nestjs/common';
import { CallRequirementsV1, DraftOutputV1, ImpactRecommendationV1 } from '../analysis/contracts';

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);

  modelName() {
    return process.env.LLM_MODEL || 'gpt-4.1-mini';
  }

  async healthCheck() {
    const configured = this.hasOpenAIConfig();
    if (!configured) {
      return {
        ok: false,
        mode: 'fallback',
        model: this.modelName(),
        reason: 'OPENAI_API_KEY missing',
      };
    }

    try {
      const pong = await this.callOpenAIText(
        'Responde exactamente con la palabra OK.',
        'Health check. Return only OK.',
      );

      return {
        ok: pong.toUpperCase().includes('OK'),
        mode: 'openai',
        model: this.modelName(),
        responseSample: pong.slice(0, 40),
      };
    } catch (error) {
      return {
        ok: false,
        mode: 'fallback',
        model: this.modelName(),
        reason: String(error),
      };
    }
  }

  async chatAssistant(input: {
    message: string;
    context?: {
      callTitle?: string;
      callText?: string;
      phase1Requirements?: unknown;
      documentMarkdown?: string;
    };
  }): Promise<string> {
    if (!this.hasOpenAIConfig()) {
      return this.chatAssistantMock(input);
    }

    const system = [
      'Eres un asistente tecnico para proyectos ambientales.',
      'Responde en espanol, concreto y accionable.',
      'Si falta contexto, dilo explicitamente y sugiere el siguiente dato a revisar.',
    ].join(' ');

    const user = [
      'Contexto:',
      JSON.stringify({
        callTitle: input.context?.callTitle || null,
        phase1Requirements: input.context?.phase1Requirements || null,
        callText: (input.context?.callText || '').slice(0, 6000),
        documentMarkdown: (input.context?.documentMarkdown || '').slice(0, 5000),
      }),
      '',
      `Pregunta del usuario: ${input.message}`,
    ].join('\n');

    try {
      return await this.callOpenAIText(system, user);
    } catch (error) {
      this.logger.warn(`OpenAI chatAssistant failed, fallback to mock: ${String(error)}`);
      return this.chatAssistantMock(input);
    }
  }

  async extractRequirements(
    sourceType: string,
    text: string,
    context?: {
      activities?: Array<{ name: string; region: string; documented: boolean }>;
      formTemplates?: Array<{ name: string; version: number }>;
      impactTasks?: Array<{ title: string; priority: number }>;
    },
  ): Promise<CallRequirementsV1> {
    if (!this.hasOpenAIConfig()) {
      return this.extractRequirementsMock(sourceType, text);
    }

    const system = [
      'Eres un analista experto en convocatorias ambientales.',
      'Debes responder SOLO JSON valido.',
      'No inventes datos que no existan en el texto.',
      'Si falta informacion, usa arrays vacios o null.',
    ].join(' ');

    const user = [
      `Fuente: ${sourceType}`,
      'Extrae requisitos en este esquema exacto:',
      JSON.stringify({
        meta: {
          schemaVersion: 'call-requirements-v1',
          model: 'string',
          generatedAt: 'ISO date',
        },
        requirements: {
          minimumActivities: 5,
          requiredFormTemplates: 1,
          requiredEvidenceCount: 5,
          requiredDeliverables: ['string'],
          requiresBudget: true,
          requiresTimeline: true,
          deadline: 'string | omitted',
          budget: 'string | omitted',
        },
        scoringCriteria: ['string'],
        constraints: ['string'],
        evidence: [{ requirementKey: 'string', quote: 'string', sourceChunkId: 'string' }],
        confidence: 'LOW | MEDIUM | HIGH',
      }),
      'Base de conocimiento disponible para el tenant:',
      JSON.stringify({
        activities: context?.activities || [],
        formTemplates: context?.formTemplates || [],
        impactTasks: context?.impactTasks || [],
      }),
      'Texto de convocatoria:',
      text.slice(0, 18000),
    ].join('\n\n');

    try {
      const parsed = await this.callOpenAIJson(system, user);
      return this.normalizeRequirements(parsed);
    } catch (error) {
      this.logger.warn(`OpenAI extractRequirements failed, fallback to mock: ${String(error)}`);
      return this.extractRequirementsMock(sourceType, text);
    }
  }

  async rankImpactTasks(
    requirementsText: string,
    tasks: Array<{ id: string; title: string; description: string; priority: number }>,
  ): Promise<ImpactRecommendationV1> {
    if (!this.hasOpenAIConfig()) {
      return this.rankImpactTasksMock(requirementsText, tasks);
    }

    const system = [
      'Eres un analista para seleccion inteligente de tareas de impacto ambiental.',
      'Responde SOLO JSON valido.',
      'Score entre 0 y 100.',
      'No inventes taskId; usa solo los IDs entregados.',
    ].join(' ');

    const user = [
      'Requisitos de convocatoria:',
      requirementsText.slice(0, 8000),
      'Catalogo de tareas:',
      JSON.stringify(tasks),
      'Devuelve este esquema JSON:',
      JSON.stringify({
        rankedTasks: [
          {
            taskId: 'string',
            score: 0,
            rationale: 'string',
            prerequisites: ['string'],
          },
        ],
        coverage: {
          riskMitigation: 0,
          feasibility: 0,
          expectedImpact: 0,
        },
      }),
    ].join('\n\n');

    try {
      const parsed = await this.callOpenAIJson(system, user);
      return this.normalizeImpactRecommendation(parsed, tasks.map((x) => x.id));
    } catch (error) {
      this.logger.warn(`OpenAI rankImpactTasks failed, fallback to mock: ${String(error)}`);
      return this.rankImpactTasksMock(requirementsText, tasks);
    }
  }

  async buildDraft(input: {
    title: string;
    problemSummary: string;
    minimumActivities: number;
    requiredDeliverables: string[];
    rankedTasks: Array<{ title: string; description: string; score: number }>;
    budget?: string;
    deadline?: string;
  }): Promise<DraftOutputV1> {
    if (!this.hasOpenAIConfig()) {
      return this.buildDraftMock(input);
    }

    const system = [
      'Eres un redactor tecnico ambiental.',
      'Redacta anteproyectos claros, formales y accionables.',
      'Devuelve SOLO JSON valido.',
      'No inventes cifras no presentes; marca supuestos en qualityChecks.assumptions.',
    ].join(' ');

    const user = [
      'Genera el borrador en este esquema JSON exacto:',
      JSON.stringify({
        sections: [
          {
            id: 'string',
            title: 'string',
            markdown: 'string',
            evidenceRefs: ['string'],
          },
        ],
        qualityChecks: {
          missingData: ['string'],
          assumptions: ['string'],
        },
      }),
      'Datos de entrada:',
      JSON.stringify(input),
    ].join('\n\n');

    try {
      const parsed = await this.callOpenAIJson(system, user);
      return this.normalizeDraft(parsed, input);
    } catch (error) {
      this.logger.warn(`OpenAI buildDraft failed, fallback to mock: ${String(error)}`);
      return this.buildDraftMock(input);
    }
  }

  private hasOpenAIConfig() {
    return Boolean(process.env.OPENAI_API_KEY);
  }

  private async callOpenAIJson(system: string, user: string): Promise<unknown> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

    const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: this.modelName(),
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`OpenAI HTTP ${response.status}: ${text}`);
    }

    const json = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const content = json.choices?.[0]?.message?.content;
    if (!content) throw new Error('OpenAI returned empty content');

    return JSON.parse(content);
  }

  private async callOpenAIText(system: string, user: string): Promise<string> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

    const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: this.modelName(),
        temperature: 0.3,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`OpenAI HTTP ${response.status}: ${text}`);
    }

    const json = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const content = json.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error('OpenAI returned empty assistant content');
    return content;
  }

  private normalizeRequirements(raw: unknown): CallRequirementsV1 {
    const now = new Date().toISOString();
    const data = (raw && typeof raw === 'object' ? raw : {}) as Record<string, any>;
    const req = (data.requirements && typeof data.requirements === 'object' ? data.requirements : {}) as Record<string, any>;

    return {
      meta: {
        schemaVersion: 'call-requirements-v1',
        model: this.modelName(),
        generatedAt: now,
      },
      requirements: {
        minimumActivities: this.safePositiveInt(req.minimumActivities, 5),
        requiredFormTemplates: this.safeNonNegativeInt(req.requiredFormTemplates, 0),
        requiredEvidenceCount: this.safePositiveInt(req.requiredEvidenceCount, 5),
        requiredDeliverables: this.safeStringArray(req.requiredDeliverables),
        requiresBudget: Boolean(req.requiresBudget),
        requiresTimeline: Boolean(req.requiresTimeline),
        deadline: this.safeOptionalString(req.deadline),
        budget: this.safeOptionalString(req.budget),
      },
      scoringCriteria: this.safeStringArray(data.scoringCriteria),
      constraints: this.safeStringArray(data.constraints),
      evidence: this.safeEvidence(data.evidence),
      confidence: this.safeConfidence(data.confidence),
    };
  }

  private normalizeImpactRecommendation(raw: unknown, allowedTaskIds: string[]): ImpactRecommendationV1 {
    const data = (raw && typeof raw === 'object' ? raw : {}) as Record<string, any>;
    const rankedRaw = Array.isArray(data.rankedTasks) ? data.rankedTasks : [];

    const rankedTasks = rankedRaw
      .map((item) => {
        const record = (item && typeof item === 'object' ? item : {}) as Record<string, any>;
        return {
          taskId: String(record.taskId || ''),
          score: this.safeScore(record.score),
          rationale: this.safeOptionalString(record.rationale) || 'Sin justificacion explicita.',
          prerequisites: this.safeStringArray(record.prerequisites),
        };
      })
      .filter((item) => allowedTaskIds.includes(item.taskId))
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);

    return {
      rankedTasks,
      coverage: {
        riskMitigation: this.safeScore((data.coverage || {}).riskMitigation),
        feasibility: this.safeScore((data.coverage || {}).feasibility),
        expectedImpact: this.safeScore((data.coverage || {}).expectedImpact),
      },
    };
  }

  private normalizeDraft(raw: unknown, input: { title: string }): DraftOutputV1 {
    const data = (raw && typeof raw === 'object' ? raw : {}) as Record<string, any>;
    const sectionsRaw = Array.isArray(data.sections) ? data.sections : [];

    const sections = sectionsRaw
      .map((item, idx) => {
        const record = (item && typeof item === 'object' ? item : {}) as Record<string, any>;
        const id = this.safeOptionalString(record.id) || `section_${idx + 1}`;
        const title = this.safeOptionalString(record.title) || `Seccion ${idx + 1}`;
        const markdown = this.safeOptionalString(record.markdown) || `## ${title}\nContenido pendiente.`;
        return {
          id,
          title,
          markdown,
          evidenceRefs: this.safeStringArray(record.evidenceRefs),
        };
      })
      .slice(0, 12);

    if (!sections.length) {
      return this.buildDraftMock({
        title: input.title,
        problemSummary: '',
        minimumActivities: 5,
        requiredDeliverables: [],
        rankedTasks: [],
      });
    }

    return {
      sections,
      qualityChecks: {
        missingData: this.safeStringArray((data.qualityChecks || {}).missingData),
        assumptions: this.safeStringArray((data.qualityChecks || {}).assumptions),
      },
    };
  }

  private extractRequirementsMock(sourceType: string, text: string): CallRequirementsV1 {
    const normalized = text.toLowerCase();
    const minimumActivities = this.extractMinimum(normalized, [/minimo\s+(\d+)\s+actividades?/, /al\s+menos\s+(\d+)\s+actividades?/], 5);
    const requiredTemplates = this.extractMinimum(normalized, [/minimo\s+(\d+)\s+(?:formatos?|formularios?|fichas?|plantillas?)/], /(formato|formulario|ficha|plantilla)/.test(normalized) ? 1 : 0);

    return {
      meta: {
        schemaVersion: 'call-requirements-v1',
        model: 'mock-llm-v1',
        generatedAt: new Date().toISOString(),
      },
      requirements: {
        minimumActivities,
        requiredFormTemplates: requiredTemplates,
        requiredEvidenceCount: minimumActivities,
        requiredDeliverables: this.extractDeliverablesMock(text),
        requiresBudget: /(presupuesto|cofinanciacion|monto)/.test(normalized),
        requiresTimeline: /(cronograma|plazo|duracion|meses)/.test(normalized),
        deadline: this.extractFirst(text, [/\b\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}\b/, /\b\d{1,2}\s+de\s+[a-z]+\s+de\s+\d{4}\b/i]) || undefined,
        budget: this.extractFirst(text, [/\$\s?\d[\d,.\s]*/, /\b(?:usd|mxn|cop|eur)\s?\d[\d,.\s]*/i]) || undefined,
      },
      scoringCriteria: ['Pertinencia tecnica', 'Viabilidad operativa', 'Impacto ambiental'],
      constraints: ['Cumplir requerimientos tecnicos y documentales de la convocatoria.'],
      evidence: [],
      confidence: text.length > 1200 ? 'HIGH' : text.length > 350 ? 'MEDIUM' : 'LOW',
    };
  }

  private rankImpactTasksMock(
    requirementsText: string,
    tasks: Array<{ id: string; title: string; description: string; priority: number }>,
  ): ImpactRecommendationV1 {
    const needles = this.extractKeywords(requirementsText);

    const rankedTasks = tasks
      .map((task) => {
        const haystack = `${task.title} ${task.description}`.toLowerCase();
        let keywordHits = 0;
        for (const keyword of needles) {
          if (haystack.includes(keyword)) keywordHits += 1;
        }

        const score = Math.min(100, 45 + keywordHits * 10 + (6 - Math.min(task.priority, 5)) * 5);

        return {
          taskId: task.id,
          score,
          rationale: `Alineacion por ${keywordHits} coincidencias tematicas y prioridad tecnica ${task.priority}.`,
          prerequisites: ['Disponibilidad de equipo tecnico', 'Validacion territorial previa'],
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);

    return {
      rankedTasks,
      coverage: {
        riskMitigation: this.avg(rankedTasks.map((x) => Math.max(50, x.score - 10))),
        feasibility: this.avg(rankedTasks.map((x) => Math.max(50, x.score - 15))),
        expectedImpact: this.avg(rankedTasks.map((x) => x.score)),
      },
    };
  }

  private buildDraftMock(input: {
    title: string;
    problemSummary: string;
    minimumActivities: number;
    requiredDeliverables: string[];
    rankedTasks: Array<{ title: string; description: string; score: number }>;
    budget?: string;
    deadline?: string;
  }): DraftOutputV1 {
    const sections: DraftOutputV1['sections'] = [
      {
        id: 'contexto',
        title: 'Contexto y Problemática',
        markdown: `## Contexto y Problemática\n${input.problemSummary || 'Se requiere atencion ambiental focalizada segun la convocatoria.'}`,
        evidenceRefs: ['EVID-CTX-1'],
      },
      {
        id: 'objetivos',
        title: 'Objetivos',
        markdown: [
          '## Objetivos',
          '- Objetivo general: Mitigar el impacto ambiental priorizado por la convocatoria.',
          '- Objetivos especificos:',
          `  - Ejecutar al menos ${input.minimumActivities} actividades documentadas.`,
          '  - Implementar intervenciones con seguimiento verificable.',
        ].join('\n'),
        evidenceRefs: ['EVID-OBJ-1'],
      },
      {
        id: 'intervenciones',
        title: 'Plan de Intervención y Tareas de Impacto',
        markdown: [
          '## Plan de Intervención y Tareas de Impacto',
          ...input.rankedTasks.slice(0, 5).map(
            (task, i) => `${i + 1}. **${task.title}** (${task.score}/100): ${task.description}`,
          ),
        ].join('\n'),
        evidenceRefs: ['EVID-TASK-1'],
      },
      {
        id: 'entregables',
        title: 'Entregables y Evidencias',
        markdown: [
          '## Entregables y Evidencias',
          ...(input.requiredDeliverables.length
            ? input.requiredDeliverables.map((x) => `- ${x}`)
            : ['- Informe tecnico final', '- Anexos y evidencias de campo']),
        ].join('\n'),
        evidenceRefs: ['EVID-DEL-1'],
      },
      {
        id: 'cronograma-presupuesto',
        title: 'Cronograma y Presupuesto',
        markdown: [
          '## Cronograma y Presupuesto',
          `- Presupuesto de referencia: ${input.budget || 'Por definir segun lineamientos de convocatoria.'}`,
          `- Fecha objetivo de cierre: ${input.deadline || 'Por definir.'}`,
        ].join('\n'),
        evidenceRefs: ['EVID-SCHED-1'],
      },
    ];

    return {
      sections,
      qualityChecks: {
        missingData: [],
        assumptions: ['El borrador debe ser revisado y ajustado por el equipo tecnico antes del envio final.'],
      },
    };
  }

  private chatAssistantMock(input: { message: string; context?: { callTitle?: string } }) {
    return [
      'Asistente IA contextual (modo fallback):',
      input.context?.callTitle ? `Convocatoria activa: ${input.context.callTitle}` : 'No hay convocatoria activa seleccionada.',
      `Consulta: ${input.message}`,
      'Siguiente paso sugerido: revisar requisitos extraidos en FASE_1 y validar brechas antes de editar el anteproyecto.',
    ].join('\n');
  }

  private extractDeliverablesMock(text: string) {
    const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
    return lines
      .filter((line) => /^(?:[-*]|\d+[.)])\s+/.test(line))
      .filter((line) => /(entregable|anexo|pdf|formulario|informe|evidencia|cartografia|cartografía)/i.test(line))
      .map((line) => line.replace(/^(?:[-*]|\d+[.)])\s+/, '').trim())
      .slice(0, 12);
  }

  private extractKeywords(text: string) {
    const normalized = text.toLowerCase();
    const candidates = [
      'agua',
      'hidrica',
      'hídrica',
      'reforestacion',
      'reforestación',
      'erosion',
      'erosión',
      'suelo',
      'restauracion',
      'restauración',
      'cuenca',
      'monitoreo',
      'comunidad',
      'biodiversidad',
      'residuos',
      'educacion',
      'educación',
    ];

    return candidates.filter((x) => normalized.includes(x.replace('í', 'i').replace('ó', 'o')) || normalized.includes(x));
  }

  private extractMinimum(text: string, patterns: RegExp[], fallback: number) {
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match?.[1]) {
        const parsed = Number(match[1]);
        if (Number.isFinite(parsed) && parsed > 0) return parsed;
      }
    }
    return fallback;
  }

  private extractFirst(text: string, patterns: RegExp[]) {
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match?.[0]) return match[0].trim();
    }
    return '';
  }

  private safePositiveInt(value: unknown, fallback: number) {
    const num = Number(value);
    if (!Number.isFinite(num) || num <= 0) return fallback;
    return Math.round(num);
  }

  private safeNonNegativeInt(value: unknown, fallback: number) {
    const num = Number(value);
    if (!Number.isFinite(num) || num < 0) return fallback;
    return Math.round(num);
  }

  private safeScore(value: unknown) {
    const num = Number(value);
    if (!Number.isFinite(num)) return 0;
    return Math.max(0, Math.min(100, Math.round(num)));
  }

  private safeOptionalString(value: unknown) {
    if (typeof value !== 'string') return '';
    const trimmed = value.trim();
    return trimmed;
  }

  private safeStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value
      .map((x) => (typeof x === 'string' ? x.trim() : ''))
      .filter(Boolean)
      .slice(0, 50);
  }

  private safeEvidence(value: unknown): CallRequirementsV1['evidence'] {
    if (!Array.isArray(value)) return [];

    return value
      .map((item) => {
        const row = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
        const requirementKey = this.safeOptionalString(row.requirementKey);
        const quote = this.safeOptionalString(row.quote);
        const sourceChunkId = this.safeOptionalString(row.sourceChunkId) || 'chunk_unknown';
        if (!requirementKey || !quote) return null;
        return { requirementKey, quote, sourceChunkId };
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x))
      .slice(0, 60);
  }

  private safeConfidence(value: unknown): CallRequirementsV1['confidence'] {
    if (value === 'LOW' || value === 'MEDIUM' || value === 'HIGH') return value;
    return 'MEDIUM';
  }

  private avg(values: number[]) {
    if (!values.length) return 0;
    return Math.round(values.reduce((acc, v) => acc + v, 0) / values.length);
  }
}
