import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CallStatus, Prisma, SourceType } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import { ImportCallDto, SubmitCallFormResponseDto } from './dto';
import { LlmService } from '../llm/llm.service';
import { CallRequirementsV1, DraftOutputV1, ImpactRecommendationV1 } from '../analysis/contracts';
import { issueCollabToken, verifyCollabToken } from '../../common/collab-token';

export interface GapReportDTO {
  callId: string;
  gaps: Array<{
    code: string;
    description: string;
    requiredCount: number;
    currentCount: number;
  }>;
  blocked: boolean;
}

type ContextualActivity = {
  id: string;
  name: string;
  region: string;
  documented: boolean;
  formLinks: Array<{ required: boolean; formTemplate: { id: string; name: string; isActive: boolean; schemaJson?: unknown } }>;
};

@Injectable()
export class CallsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly llmService: LlmService,
  ) {}

  async list(tenantId: string) {
    return this.prisma.callForProposal.findMany({
      where: { tenantId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        sourceType: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        documentDraft: {
          select: {
            id: true,
            version: true,
            updatedAt: true,
          },
        },
      },
    });
  }

  async remove(tenantId: string, callId: string) {
    const call = await this.prisma.callForProposal.findFirst({
      where: { id: callId, tenantId },
      select: {
        id: true,
        title: true,
        documentDraft: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!call) throw new NotFoundException('Call not found');

    if (call.documentDraft) {
      throw new BadRequestException(
        'No se puede eliminar la convocatoria porque ya tiene un anteproyecto asociado.',
      );
    }

    await this.prisma.callForProposal.delete({
      where: { id: call.id },
    });

    return {
      id: call.id,
      title: call.title,
      deleted: true,
    };
  }

  async createCollabShare(tenantId: string, ownerUserId: string, callId: string) {
    const call = await this.prisma.callForProposal.findFirst({
      where: { id: callId, tenantId },
      select: { id: true, title: true },
    });
    if (!call) throw new NotFoundException('Call not found');

    const ttlSeconds = Number(process.env.COLLAB_TOKEN_TTL_SECONDS || 259200) || 259200;
    const expiresAt = Date.now() + ttlSeconds * 1000;
    const token = issueCollabToken({
      tenantId,
      callId: call.id,
      ownerUserId,
      exp: expiresAt,
    });

    return {
      callId: call.id,
      callTitle: call.title,
      token,
      expiresAt: new Date(expiresAt).toISOString(),
      expiresInSeconds: ttlSeconds,
    };
  }

  async getPublicPendingForms(callId: string, token: string) {
    const payload = this.readCollabToken(callId, token);
    const call = await this.prisma.callForProposal.findFirst({
      where: { id: callId, tenantId: payload.tenantId },
      select: { id: true, title: true, status: true },
    });
    if (!call) throw new NotFoundException('Call not found');

    const pending = await this.getPendingForms(payload.tenantId, payload.ownerUserId, callId);
    return {
      callId: call.id,
      callTitle: call.title,
      status: call.status,
      pendingForms: pending.pendingForms,
      completedForms: pending.completedForms,
      completedFormItems: pending.completedFormItems,
    };
  }

  async submitPublicFormResponse(
    callId: string,
    dto: {
      token: string;
      activityId: string;
      formTemplateId: string;
      response: Record<string, unknown>;
      assistantName?: string;
    },
  ) {
    const payload = this.readCollabToken(callId, dto.token);
    const response: Record<string, unknown> = {
      ...(dto.response || {}),
    };

    if (dto.assistantName?.trim()) {
      response._assistantMeta = {
        assistantName: dto.assistantName.trim(),
        submittedAt: new Date().toISOString(),
      };
    }

    return this.submitFormResponse(payload.tenantId, payload.ownerUserId, callId, {
      activityId: dto.activityId,
      formTemplateId: dto.formTemplateId,
      response,
    });
  }

  async importCall(tenantId: string, dto: ImportCallDto) {
    if (dto.sourceType === 'URL' && !dto.sourceUrl) {
      throw new BadRequestException('sourceUrl is required for URL source type');
    }

    if ((dto.sourceType === 'PDF' || dto.sourceType === 'DOCX') && !dto.sourceStorageKey) {
      throw new BadRequestException('sourceStorageKey is required for PDF/DOCX source type');
    }

    if (dto.sourceType === 'MD' && !dto.markdownContent) {
      throw new BadRequestException('markdownContent is required for MD source type');
    }

    return this.prisma.callForProposal.create({
      data: {
        tenantId,
        title: dto.title,
        sourceType: dto.sourceType as SourceType,
        sourceUrl: dto.sourceUrl,
        sourceStorageKey: dto.sourceStorageKey || dto.fileName,
        extractedText: dto.sourceType === 'MD' ? dto.markdownContent : undefined,
        status: CallStatus.IMPORTED,
      },
    });
  }

  async getStatus(tenantId: string, callId: string) {
    const call = await this.prisma.callForProposal.findFirst({ where: { id: callId, tenantId } });
    if (!call) throw new NotFoundException('Call not found');
    return { id: call.id, status: call.status, updatedAt: call.updatedAt };
  }

  async analyzePhase1(tenantId: string, callId: string, userId?: string): Promise<GapReportDTO> {
    return this.runPhase1Analysis(tenantId, callId, false, userId);
  }

  async analyzePhase1Llm(tenantId: string, callId: string, userId?: string): Promise<{
    callId: string;
    status: CallStatus;
    requirements: CallRequirementsV1;
    gapReport: GapReportDTO;
  }> {
    return this.runPhase1Analysis(tenantId, callId, true, userId);
  }

  async getAnalysis(tenantId: string, callId: string) {
    const call = await this.prisma.callForProposal.findFirst({ where: { id: callId, tenantId } });
    if (!call) throw new NotFoundException('Call not found');

    return {
      callId: call.id,
      status: call.status,
      requirements: call.phase1Requirements,
      gapReport: call.phase1GapReport,
    };
  }

  async getGaps(tenantId: string, callId: string, userId?: string) {
    const call = await this.prisma.callForProposal.findFirst({ where: { id: callId, tenantId } });
    if (!call) throw new NotFoundException('Call not found');

    const pendingForms = await this.getPendingForms(tenantId, userId || 'system', callId);

    return {
      callId: call.id,
      status: call.status,
      report: call.phase1GapReport ?? { gaps: [], blocked: false },
      pendingForms: pendingForms.pendingForms,
    };
  }

  async getPendingForms(tenantId: string, userId: string, callId: string) {
    const call = await this.prisma.callForProposal.findFirst({ where: { id: callId, tenantId } });
    if (!call) throw new NotFoundException('Call not found');

    const [activities, responses] = await Promise.all([
      this.prisma.activity.findMany({
        where: { tenantId, documented: true },
        select: {
          id: true,
          name: true,
          region: true,
          documented: true,
          formLinks: {
            where: { required: true },
            select: {
              required: true,
              formTemplate: { select: { id: true, name: true, isActive: true, schemaJson: true } },
            },
          },
        },
      }),
      (this.prisma as any).callActivityFormResponse.findMany({
        where: { tenantId, callId, userId },
        select: { activityId: true, formTemplateId: true },
      }),
    ]);

    const contextualCoverage = this.evaluateContextualCoverage(this.buildAnalysisText(call), activities, responses);
    return {
      callId,
      pendingForms: contextualCoverage.pendingForms.map((item) => ({
        activityId: item.activityId,
        activityName: item.activityName,
        formTemplateId: item.formTemplateId,
        formTemplateName: item.formTemplateName,
        schemaJson: item.schemaJson,
      })),
      completedForms: contextualCoverage.completedForms,
      completedFormItems: contextualCoverage.completedFormItems,
    };
  }

  async submitFormResponse(tenantId: string, userId: string, callId: string, dto: SubmitCallFormResponseDto) {
    const [call, activity, template] = await Promise.all([
      this.prisma.callForProposal.findFirst({ where: { id: callId, tenantId } }),
      this.prisma.activity.findFirst({ where: { id: dto.activityId, tenantId } }),
      this.prisma.formTemplate.findFirst({ where: { id: dto.formTemplateId, tenantId } }),
    ]);
    if (!call) throw new NotFoundException('Call not found');
    if (!activity) throw new NotFoundException('Activity not found');
    if (!template) throw new NotFoundException('Form template not found');

    const link = await this.prisma.activityFormTemplate.findFirst({
      where: { tenantId, activityId: activity.id, formTemplateId: template.id },
    });
    if (!link) {
      throw new BadRequestException('The selected form template is not linked to the activity.');
    }
    this.validateTemplateResponse(template.schemaJson, dto.response);

    const saved = await (this.prisma as any).callActivityFormResponse.upsert({
      where: {
        callId_activityId_formTemplateId_userId: {
          callId,
          activityId: activity.id,
          formTemplateId: template.id,
          userId,
        },
      },
      create: {
        tenantId,
        callId,
        activityId: activity.id,
        formTemplateId: template.id,
        userId,
        responseJson: dto.response as Prisma.InputJsonValue,
      },
      update: {
        responseJson: dto.response as Prisma.InputJsonValue,
        completedAt: new Date(),
      },
    });

    return {
      callId,
      activityId: saved.activityId,
      formTemplateId: saved.formTemplateId,
      completedAt: saved.completedAt,
      message: 'Formulario guardado correctamente.',
    };
  }

  async recommendImpactTasks(tenantId: string, callId: string) {
    const call = await this.prisma.callForProposal.findFirst({ where: { id: callId, tenantId } });
    if (!call) throw new NotFoundException('Call not found');

    const requirements = this.readRequirements(call.phase1Requirements);
    if (!requirements) {
      throw new BadRequestException('Run phase-1 analysis before requesting intelligent impact task selection.');
    }

    const tasks = await this.prisma.impactTask.findMany({
      where: { tenantId },
      orderBy: { priority: 'asc' },
      take: 20,
    });

    if (!tasks.length) {
      throw new BadRequestException('No impact tasks available. Create impact tasks first.');
    }

    const requirementText = [
      call.title,
      call.extractedText || '',
      ...requirements.requirements.requiredDeliverables,
      ...requirements.constraints,
    ].join('\n');

    const recommendation = await this.llmService.rankImpactTasks(requirementText, tasks);

    await this.prisma.callForProposal.update({
      where: { id: call.id },
      data: {
        phase1Requirements: {
          ...(call.phase1Requirements as Record<string, unknown>),
          impactRecommendation: recommendation,
          impactRecommendationGeneratedAt: new Date().toISOString(),
        } as unknown as Prisma.InputJsonValue,
      },
    });

    return {
      callId: call.id,
      recommendation,
    };
  }

  async generateDraftLlm(tenantId: string, callId: string) {
    const call = await this.prisma.callForProposal.findFirst({ where: { id: callId, tenantId } });
    if (!call) throw new NotFoundException('Call not found');

    if (call.status !== CallStatus.READY_FOR_PHASE_2) {
      throw new BadRequestException('Call is not ready for phase 2. Resolve phase 1 gaps first.');
    }

    const requirements = this.readRequirements(call.phase1Requirements);
    if (!requirements) {
      throw new BadRequestException('Requirements not available. Run analysis first.');
    }

    const recommendation = this.readImpactRecommendation(call.phase1Requirements);
    const rankedTasks = recommendation?.rankedTasks?.length
      ? recommendation.rankedTasks
      : (await this.recommendImpactTasks(tenantId, call.id)).recommendation.rankedTasks;

    const [taskRecords, activityRecords, templateRecords] = await Promise.all([
      this.prisma.impactTask.findMany({
        where: { tenantId, id: { in: rankedTasks.map((x) => x.taskId) } },
      }),
      this.prisma.activity.findMany({
        where: { tenantId, documented: true },
        select: { name: true, region: true },
        take: 8,
      }),
      this.prisma.formTemplate.findMany({
        where: { tenantId, isActive: true },
        select: { name: true, version: true },
        take: 8,
      }),
    ]);
    const taskMap = new Map(taskRecords.map((task) => [task.id, task]));

    const draft = await this.llmService.buildDraft({
      title: call.title,
      problemSummary: [
        requirements.constraints[0] || 'Abordar la problematica socioambiental priorizada por la convocatoria.',
        activityRecords.length
          ? `Actividades base disponibles: ${activityRecords.map((x) => `${x.name} (${x.region})`).join(', ')}.`
          : 'No hay actividades base documentadas.',
        templateRecords.length
          ? `Formatos disponibles: ${templateRecords.map((x) => `${x.name} v${x.version}`).join(', ')}.`
          : 'No hay formatos base activos.',
      ].join(' '),
      minimumActivities: requirements.requirements.minimumActivities,
      requiredDeliverables: requirements.requirements.requiredDeliverables,
      rankedTasks: rankedTasks.map((x) => {
        const task = taskMap.get(x.taskId);
        return {
          title: task?.title || `Tarea ${x.taskId}`,
          description: task?.description || x.rationale,
          score: x.score,
        };
      }),
      budget: requirements.requirements.budget,
      deadline: requirements.requirements.deadline,
    });

    const markdownSource = this.renderDraftMarkdown(call.title, draft);

    const document = await this.prisma.documentDraft.upsert({
      where: { callId: call.id },
      create: {
        tenantId,
        callId: call.id,
        title: `Anteproyecto ${call.title}`,
        markdownSource,
        astSnapshot: draft as unknown as Prisma.InputJsonValue,
      },
      update: {
        markdownSource,
        astSnapshot: draft as unknown as Prisma.InputJsonValue,
        version: { increment: 1 },
      },
    });

    await this.prisma.callForProposal.update({
      where: { id: call.id },
      data: {
        status: CallStatus.GENERATED_PHASE_2,
      },
    });

    return {
      callId: call.id,
      documentId: document.id,
      status: CallStatus.GENERATED_PHASE_2,
      draft,
    };
  }

  async draftQuality(tenantId: string, callId: string) {
    const call = await this.prisma.callForProposal.findFirst({ where: { id: callId, tenantId } });
    if (!call) throw new NotFoundException('Call not found');

    const requirements = this.readRequirements(call.phase1Requirements);
    if (!requirements) throw new BadRequestException('Requirements not available. Run analysis first.');

    const doc = await this.prisma.documentDraft.findFirst({ where: { tenantId, callId: call.id } });
    if (!doc) throw new NotFoundException('Draft document not found for this call');

    const markdown = doc.markdownSource.toLowerCase();
    const missingData: string[] = [];

    if (requirements.requirements.requiresBudget && !markdown.includes('presupuesto')) {
      missingData.push('No se detecta seccion de presupuesto en el borrador.');
    }

    if (requirements.requirements.requiresTimeline && !markdown.includes('cronograma')) {
      missingData.push('No se detecta seccion de cronograma en el borrador.');
    }

    for (const deliverable of requirements.requirements.requiredDeliverables) {
      const needle = deliverable.toLowerCase();
      if (needle.length > 3 && !markdown.includes(needle.slice(0, Math.min(needle.length, 24)))) {
        missingData.push(`Entregable potencialmente no cubierto: ${deliverable}`);
      }
    }

    return {
      callId: call.id,
      documentId: doc.id,
      qualityChecks: {
        missingData,
        assumptions: [
          'La revision humana es obligatoria antes del envio final.',
          'Validar anexos y evidencias territoriales con el equipo tecnico.',
        ],
      },
    };
  }

  async autoProcess(tenantId: string, userId: string, callId: string) {
    const phase1 = await this.analyzePhase1Llm(tenantId, callId, userId);
    if (phase1.gapReport.blocked) {
      return {
        callId,
        status: phase1.status,
        blocked: true,
        message: 'No cumple minimos para pasar a fase de edicion.',
        gapReport: phase1.gapReport,
      };
    }

    const draft = await this.generateDraftLlm(tenantId, callId);
    return {
      callId,
      status: draft.status,
      blocked: false,
      documentId: draft.documentId,
      message: 'Analisis automatico completado. Ya puedes editar el anteproyecto.',
      gapReport: phase1.gapReport,
    };
  }

  async generatePhase2(tenantId: string, callId: string) {
    const call = await this.prisma.callForProposal.findFirst({ where: { id: callId, tenantId } });
    if (!call) throw new NotFoundException('Call not found');

    if (call.status !== CallStatus.READY_FOR_PHASE_2) {
      throw new BadRequestException('Call is not ready for phase 2. Resolve phase 1 gaps first.');
    }

    const impactRecommendation = this.readImpactRecommendation(call.phase1Requirements);
    let impactTasks = await this.prisma.impactTask.findMany({ where: { tenantId }, take: 5, orderBy: { priority: 'asc' } });

    if (impactRecommendation?.rankedTasks?.length) {
      const rankedIds = impactRecommendation.rankedTasks.map((x) => x.taskId);
      const rankedRecords = await this.prisma.impactTask.findMany({ where: { tenantId, id: { in: rankedIds } } });
      const byId = new Map(rankedRecords.map((task) => [task.id, task]));
      impactTasks = rankedIds.map((id) => byId.get(id)).filter((x): x is NonNullable<typeof x> => Boolean(x)).slice(0, 5);
      if (!impactTasks.length) {
        impactTasks = rankedRecords.slice(0, 5);
      }
    }

    const markdownSource = [
      `# Anteproyecto: ${call.title}`,
      '',
      '## 1. Problematica',
      'Descripcion de la problematica identificada a partir de la convocatoria.',
      '',
      '## 2. Objetivos',
      '- Objetivo general',
      '- Objetivos especificos',
      '',
      '## 3. Tareas de impacto recomendadas',
      ...impactTasks.map((task, index) => `${index + 1}. **${task.title}** - ${task.description}`),
      '',
      '## 4. Cronograma y presupuesto',
      'Definir tiempos, responsables y costo estimado.',
    ].join('\n');

    const document = await this.prisma.documentDraft.upsert({
      where: { callId: call.id },
      create: {
        tenantId,
        callId: call.id,
        title: `Anteproyecto ${call.title}`,
        markdownSource,
      },
      update: {
        markdownSource,
        version: { increment: 1 },
      },
    });

    await this.prisma.callForProposal.update({
      where: { id: call.id },
      data: { status: CallStatus.GENERATED_PHASE_2 },
    });

    return {
      callId: call.id,
      documentId: document.id,
      status: 'GENERATED_PHASE_2',
      linkedImpactTasks: impactTasks.map((task) => ({
        id: task.id,
        title: task.title,
        priority: task.priority,
      })),
    };
  }

  async confirmMinimumPlan(tenantId: string, callId: string) {
    const call = await this.prisma.callForProposal.findFirst({ where: { id: callId, tenantId } });
    if (!call) throw new NotFoundException('Call not found');

    const requirements = this.readRequirements(call.phase1Requirements);
    const requiredActivities = requirements?.requirements.minimumActivities ?? 5;
    const requiredTemplates = requirements?.requirements.requiredFormTemplates ?? 0;
    const requiredImpactTasks = 1;

    const [currentActivities, currentTemplates, currentImpactTasks, activityCatalog, templateCatalog, impactTaskCatalog, formResponses] =
      await Promise.all([
        this.prisma.activity.count({ where: { tenantId, documented: true } }),
        this.prisma.formTemplate.count({ where: { tenantId, isActive: true } }),
        this.prisma.impactTask.count({ where: { tenantId } }),
        this.prisma.activity.findMany({
          where: { tenantId },
          select: {
            id: true,
            name: true,
            region: true,
            documented: true,
            formLinks: {
              select: {
                required: true,
                formTemplate: {
                  select: {
                    id: true,
                    name: true,
                    isActive: true,
                    schemaJson: true,
                  },
                },
              },
            },
          },
          orderBy: { updatedAt: 'desc' },
          take: 15,
        }),
        this.prisma.formTemplate.findMany({
          where: { tenantId, isActive: true },
          select: { name: true, version: true },
          orderBy: { updatedAt: 'desc' },
          take: 15,
        }),
        this.prisma.impactTask.findMany({
          where: { tenantId },
          select: { title: true, priority: true },
          orderBy: { priority: 'asc' },
          take: 15,
        }),
        (this.prisma as any).callActivityFormResponse.findMany({
          where: { tenantId, callId },
          select: { activityId: true, formTemplateId: true, userId: true },
        }),
    ]);

    if (currentActivities < requiredActivities) {
      throw new BadRequestException(
        `Insufficient documented activities (${currentActivities}/${requiredActivities}).`,
      );
    }
    if (currentTemplates < requiredTemplates) {
      throw new BadRequestException(`Insufficient form templates (${currentTemplates}/${requiredTemplates}).`);
    }
    if (currentImpactTasks < requiredImpactTasks) {
      throw new BadRequestException(`Insufficient impact tasks (${currentImpactTasks}/${requiredImpactTasks}).`);
    }

    const analysisText = this.buildAnalysisText(call);
    const contextualCoverage = this.evaluateContextualCoverage(analysisText, activityCatalog, formResponses);
    if (!contextualCoverage.activityCovered || !contextualCoverage.formsCovered) {
      throw new BadRequestException(
        [
          'Contextual requirements not satisfied for this call.',
          !contextualCoverage.activityCovered ? contextualCoverage.activityGapDescription : '',
          !contextualCoverage.formsCovered ? contextualCoverage.formsGapDescription : '',
        ]
          .filter(Boolean)
          .join(' '),
      );
    }

    await this.prisma.callForProposal.update({
      where: { id: call.id },
      data: {
        status: CallStatus.READY_FOR_PHASE_2,
        phase1GapReport: {
          gaps: [],
          blocked: false,
          confirmedAt: new Date().toISOString(),
        },
      },
    });

    return {
      callId: call.id,
      status: CallStatus.READY_FOR_PHASE_2,
      coverage: {
        activities: currentActivities,
        formTemplates: currentTemplates,
        impactTasks: currentImpactTasks,
      },
    };
  }

  private async runPhase1Analysis(tenantId: string, callId: string, forceLlm: boolean, userId?: string): Promise<any> {
    const call = await this.prisma.callForProposal.findFirst({ where: { id: callId, tenantId } });
    if (!call) throw new NotFoundException('Call not found');

    const [currentActivities, currentTemplates, currentImpactTasks, activityCatalog, templateCatalog, impactTaskCatalog, formResponses] =
      await Promise.all([
        this.prisma.activity.count({ where: { tenantId, documented: true } }),
        this.prisma.formTemplate.count({ where: { tenantId, isActive: true } }),
        this.prisma.impactTask.count({ where: { tenantId } }),
        this.prisma.activity.findMany({
          where: { tenantId },
          select: {
            id: true,
            name: true,
            region: true,
            documented: true,
            formLinks: {
              select: {
                required: true,
                formTemplate: {
                  select: {
                    id: true,
                    name: true,
                    isActive: true,
                    schemaJson: true,
                  },
                },
              },
            },
          },
          orderBy: { updatedAt: 'desc' },
          take: 15,
        }),
        this.prisma.formTemplate.findMany({
          where: { tenantId, isActive: true },
          select: { name: true, version: true },
          orderBy: { updatedAt: 'desc' },
          take: 15,
        }),
        this.prisma.impactTask.findMany({
          where: { tenantId },
          select: { title: true, priority: true },
          orderBy: { priority: 'asc' },
          take: 15,
        }),
        (this.prisma as any).callActivityFormResponse.findMany({
          where: { tenantId, callId, ...(userId ? { userId } : {}) },
          select: { activityId: true, formTemplateId: true, userId: true },
        }),
      ]);

    const analysisText = this.buildAnalysisText(call);
    const requirements = forceLlm
      ? await this.llmService.extractRequirements(call.sourceType, analysisText, {
          activities: activityCatalog,
          formTemplates: templateCatalog,
          impactTasks: impactTaskCatalog,
        })
      : this.extractRequirements(call.sourceType, analysisText);

    const gaps: GapReportDTO['gaps'] = [];

    if (currentActivities < requirements.requirements.minimumActivities) {
      gaps.push({
        code: 'MIN_ACTIVITIES',
        description: 'Actividades documentadas insuficientes para soportar la convocatoria.',
        requiredCount: requirements.requirements.minimumActivities,
        currentCount: currentActivities,
      });
    }

    if (currentTemplates < requirements.requirements.requiredFormTemplates) {
      gaps.push({
        code: 'MIN_FORM_TEMPLATES',
        description: 'Faltan formatos/formularios base para documentacion obligatoria.',
        requiredCount: requirements.requirements.requiredFormTemplates,
        currentCount: currentTemplates,
      });
    }

    if (requirements.requirements.requiredEvidenceCount > currentActivities) {
      gaps.push({
        code: 'MIN_EVIDENCE_COVERAGE',
        description: 'La cantidad de evidencias documentadas es menor a la requerida.',
        requiredCount: requirements.requirements.requiredEvidenceCount,
        currentCount: currentActivities,
      });
    }

    if (currentImpactTasks < 1) {
      gaps.push({
        code: 'MIN_IMPACT_TASKS',
        description: 'Debe existir al menos una tarea de impacto para construir la propuesta tecnica.',
        requiredCount: 1,
        currentCount: currentImpactTasks,
      });
    }

    const contextualCoverage = this.evaluateContextualCoverage(analysisText, activityCatalog, formResponses);
    if (!contextualCoverage.activityCovered) {
      gaps.push({
        code: 'CONTEXT_ACTIVITY_REQUIRED',
        description: contextualCoverage.activityGapDescription,
        requiredCount: contextualCoverage.requiredContextActivities,
        currentCount: contextualCoverage.matchedContextActivities,
      });
    }
    if (!contextualCoverage.formsCovered) {
      gaps.push({
        code: 'CONTEXT_FORMS_REQUIRED',
        description: contextualCoverage.formsGapDescription,
        requiredCount: contextualCoverage.requiredContextFormKeywords,
        currentCount: contextualCoverage.matchedContextFormKeywords,
      });
    }

    const blocked = gaps.length > 0;
    const status = blocked ? CallStatus.GAP_PENDING : CallStatus.READY_FOR_PHASE_2;

    const phase1Requirements = {
      ...requirements,
      coverage: {
        activities: currentActivities,
        formTemplates: currentTemplates,
        impactTasks: currentImpactTasks,
      },
    };

    await this.prisma.callForProposal.update({
      where: { id: callId },
      data: {
        status,
        phase1Requirements: phase1Requirements as unknown as Prisma.InputJsonValue,
        phase1GapReport: { gaps, blocked },
      },
    });

    await this.prisma.aiTrace.create({
      data: {
        tenantId,
        userId: 'system-phase1',
        callId,
        prompt: forceLlm ? 'analyze-phase-1-llm' : 'analyze-phase-1',
        response: JSON.stringify({
          model: requirements.meta.model,
          status,
          blocked,
          gapsCount: gaps.length,
        }),
      },
    });

    const gapReport = { callId, gaps, blocked };
    if (!forceLlm) return gapReport;

    return {
      callId,
      status,
      requirements,
      gapReport,
    };
  }

  private buildAnalysisText(call: {
    title: string;
    sourceType: SourceType;
    extractedText: string | null;
    sourceUrl: string | null;
    sourceStorageKey: string | null;
  }) {
    const fallback = [call.title, call.sourceUrl, call.sourceStorageKey].filter(Boolean).join('\n');
    const rawText = call.extractedText || fallback;
    return rawText.slice(0, 50000);
  }

  private extractRequirements(sourceType: SourceType, text: string): CallRequirementsV1 {
    const normalized = this.normalizeText(text);

    const minimumActivities = this.extractMinimum(normalized, [
      /minimo\s+(\d+)\s+actividades?/,
      /al\s+menos\s+(\d+)\s+actividades?/,
    ], 5);

    const requiredFormTemplates = this.extractMinimum(normalized, [
      /minimo\s+(\d+)\s+(?:formatos?|formularios?|fichas?|plantillas?)/,
      /al\s+menos\s+(\d+)\s+(?:formatos?|formularios?|fichas?|plantillas?)/,
    ], /(formato|formulario|ficha|plantilla)/.test(normalized) ? 1 : 0);

    const requiredEvidenceCount = this.extractMinimum(normalized, [
      /minimo\s+(\d+)\s+(?:evidencias?|soportes?)/,
      /al\s+menos\s+(\d+)\s+(?:evidencias?|soportes?)/,
    ], minimumActivities);

    const deadline = this.extractFirst(normalized, [
      /\b\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}\b/,
      /\b\d{1,2}\s+de\s+[a-z]+\s+de\s+\d{4}\b/,
    ]);

    const budget = this.extractFirst(text, [
      /\$\s?\d[\d,.\s]*/,
      /\b(?:usd|mxn|cop|eur)\s?\d[\d,.\s]*/i,
    ]);

    const requiredDeliverables = this.extractDeliverables(text);
    const scoringCriteria = this.extractScoringCriteria(text);
    const constraints = this.extractConstraints(text);

    const evidence = requiredDeliverables.slice(0, 8).map((deliverable, index) => ({
      requirementKey: `deliverable_${index + 1}`,
      quote: deliverable,
      sourceChunkId: `chunk_${index + 1}`,
    }));

    if (deadline) {
      evidence.push({ requirementKey: 'deadline', quote: deadline, sourceChunkId: 'chunk_deadline' });
    }
    if (budget) {
      evidence.push({ requirementKey: 'budget', quote: budget, sourceChunkId: 'chunk_budget' });
    }

    const confidence: CallRequirementsV1['confidence'] = text.length > 1200 ? 'HIGH' : text.length > 300 ? 'MEDIUM' : 'LOW';

    return {
      meta: {
        schemaVersion: 'call-requirements-v1',
        model: this.llmService.modelName(),
        generatedAt: new Date().toISOString(),
      },
      requirements: {
        minimumActivities,
        requiredFormTemplates,
        requiredEvidenceCount,
        requiredDeliverables,
        requiresBudget: /(presupuesto|cofinanciacion|cofinanciación|monto)/.test(normalized),
        requiresTimeline: /(cronograma|plazo|meses|duracion|duración)/.test(normalized),
        deadline: deadline || undefined,
        budget: budget || undefined,
      },
      scoringCriteria,
      constraints,
      evidence,
      confidence,
    };
  }

  private readRequirements(raw: unknown): CallRequirementsV1 | null {
    if (!raw || typeof raw !== 'object') return null;
    const candidate = raw as Record<string, unknown>;
    if (!candidate.meta || !candidate.requirements) return null;
    return candidate as unknown as CallRequirementsV1;
  }

  private readImpactRecommendation(raw: unknown): ImpactRecommendationV1 | null {
    if (!raw || typeof raw !== 'object') return null;
    const rec = (raw as Record<string, unknown>).impactRecommendation;
    if (!rec || typeof rec !== 'object') return null;
    return rec as ImpactRecommendationV1;
  }

  private renderDraftMarkdown(title: string, draft: DraftOutputV1) {
    return [
      `# Anteproyecto: ${title}`,
      '',
      ...draft.sections.map((section) => section.markdown),
      '',
      '## Notas de calidad',
      ...draft.qualityChecks.missingData.map((item) => `- Pendiente: ${item}`),
      ...draft.qualityChecks.assumptions.map((item) => `- Supuesto: ${item}`),
    ].join('\n');
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

  private extractDeliverables(text: string) {
    const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
    const deliverables = lines
      .filter((line) => /^(?:[-*]|\d+[.)])\s+/.test(line))
      .filter((line) => /(entregable|anexo|pdf|formulario|informe|evidencia|cartografia|cartografía)/i.test(line))
      .map((line) => line.replace(/^(?:[-*]|\d+[.)])\s+/, '').trim());

    return Array.from(new Set(deliverables)).slice(0, 15);
  }

  private extractScoringCriteria(text: string) {
    const lines = text.split('\n').map((line) => line.trim());
    const candidates = lines
      .filter((line) => /(evaluacion|evaluación|criterio|ponderacion|ponderación|puntaje)/i.test(line))
      .slice(0, 10);

    return candidates.length ? candidates : ['Pertinencia tecnica', 'Viabilidad operativa', 'Impacto ambiental'];
  }

  private extractConstraints(text: string) {
    const lines = text.split('\n').map((line) => line.trim());
    const constraints = lines
      .filter((line) => /(no se financiara|no se financiará|restriccion|restricción|obligatorio|debe incluir)/i.test(line))
      .slice(0, 12);

    return constraints.length ? constraints : ['Cumplir requerimientos tecnicos y documentales de la convocatoria.'];
  }

  private normalizeText(text: string) {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  private evaluateContextualCoverage(
    analysisText: string,
    activities: ContextualActivity[],
    formResponses: Array<{ activityId: string; formTemplateId: string; userId?: string }>,
  ) {
    const normalizedText = this.normalizeText(analysisText);
    const isRiverContext = /(rio|river|cuenca|nilo|humedal|ribera|microcuenca)/.test(normalizedText);

    if (!isRiverContext) {
      return {
        activityCovered: true,
        formsCovered: true,
        requiredContextActivities: 0,
        matchedContextActivities: 0,
        requiredContextFormKeywords: 0,
        matchedContextFormKeywords: 0,
        pendingForms: [] as Array<{
          activityId: string;
          activityName: string;
          formTemplateId: string;
          formTemplateName: string;
          schemaJson?: unknown;
        }>,
        completedForms: 0,
        completedFormItems: [] as Array<{
          activityId: string;
          activityName: string;
          formTemplateId: string;
          formTemplateName: string;
        }>,
        activityGapDescription: '',
        formsGapDescription: '',
      };
    }

    const riverActivityPatterns = [
      /(recorrido|inspeccion|levantamiento|monitoreo).*(rio|cuenca|ribera|humedal|nilo)/,
      /(rio|cuenca|ribera|humedal|nilo).*(recorrido|inspeccion|levantamiento|monitoreo)/,
    ];
    const matchedRiverActivities = activities.filter((activity) => {
      if (!activity.documented) return false;
      const entry = this.normalizeText(`${activity.name} ${activity.region}`);
      return riverActivityPatterns.some((pattern) => pattern.test(entry));
    });

    const matchedContextActivities = matchedRiverActivities.length;
    const requiredContextActivities = 1;
    const activityCovered = matchedContextActivities >= requiredContextActivities;

    const responseKeys = new Set(formResponses.map((x) => `${x.activityId}:${x.formTemplateId}`));
    const candidateLinks = matchedRiverActivities.flatMap((activity) =>
      activity.formLinks
        .filter((link) => link.required && link.formTemplate.isActive)
        .map((link) => ({
          activityId: activity.id,
          activityName: activity.name,
          formTemplateId: link.formTemplate.id,
          formTemplateName: link.formTemplate.name,
          schemaJson: link.formTemplate.schemaJson,
        })),
    );
    const pendingForms = candidateLinks.filter((link) => !responseKeys.has(`${link.activityId}:${link.formTemplateId}`));
    const completedFormItems = candidateLinks
      .filter((link) => responseKeys.has(`${link.activityId}:${link.formTemplateId}`))
      .map((link) => ({
        activityId: link.activityId,
        activityName: link.activityName,
        formTemplateId: link.formTemplateId,
        formTemplateName: link.formTemplateName,
      }));
    const completedForms = candidateLinks.length - pendingForms.length;

    const matchedContextFormKeywords = completedForms;
    const requiredContextFormKeywords = Math.min(1, candidateLinks.length || 1);
    const formsCovered = completedForms >= requiredContextFormKeywords && candidateLinks.length > 0;

    return {
      activityCovered,
      formsCovered,
      requiredContextActivities,
      matchedContextActivities,
      requiredContextFormKeywords,
      matchedContextFormKeywords,
      pendingForms,
      completedForms,
      completedFormItems,
      activityGapDescription:
        'Para convocatorias de rio/cuenca se requiere al menos una actividad documentada tipo "recorrido/monitoreo por el rio".',
      formsGapDescription:
        'Para convocatorias de rio/cuenca debes completar al menos un formulario vinculado a la actividad de recorrido/monitoreo de rio.',
    };
  }

  private validateTemplateResponse(schemaJson: unknown, response: Record<string, unknown>) {
    const schema = (schemaJson || {}) as {
      fields?: Array<{
        key?: string;
        label?: string;
        type?: 'text' | 'textarea' | 'number' | 'date' | 'checkbox' | 'select';
        required?: boolean;
      }>;
    };
    const fields = Array.isArray(schema.fields) ? schema.fields : [];

    const missing: string[] = [];
    for (const field of fields) {
      if (!field?.required || !field.key) continue;
      const value = response[field.key];
      const type = field.type || 'text';
      const label = field.label || field.key;

      const isEmptyString = typeof value === 'string' && value.trim().length === 0;
      const isMissing = value === undefined || value === null || isEmptyString;
      const isInvalidNumber =
        type === 'number' && (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value));
      const isInvalidCheckbox = type === 'checkbox' && value !== true;

      if (isMissing || isInvalidNumber || isInvalidCheckbox) {
        missing.push(label);
      }
    }

    if (missing.length) {
      throw new BadRequestException(`Campos obligatorios incompletos: ${missing.join(', ')}`);
    }
  }

  private readCollabToken(callId: string, token: string) {
    if (!token?.trim()) {
      throw new BadRequestException('Missing collab token');
    }
    const payload = verifyCollabToken(token.trim());
    if (!payload) {
      throw new BadRequestException('Invalid or expired collab token');
    }
    if (payload.callId !== callId) {
      throw new BadRequestException('Collab token does not match requested call');
    }
    return payload;
  }
}
