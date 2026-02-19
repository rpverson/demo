# Integracion LLM/Chat (Next.js -> React + Vite)

## 1) Contexto minimo del proyecto
- Este proyecto implementa una plataforma de convocatorias ambientales con flujo FASE_1 (analisis de requisitos/brechas) y FASE_2 (generacion de anteproyecto).
- El chat/LLM se usa en dos frentes: asistencia contextual al usuario (`/ai/chat`) y automatizacion de analisis/redaccion (FASE_1 con IA, ranking de tareas de impacto, borrador IA).
- El frontend es Next.js y consume una API externa en NestJS (`/api/v1/*`).
- El estado de chat en UI es simple (pregunta/respuesta local), y el contexto se enriquece con `callId`/`documentId`.
- Router en frontend: **App Router** (`/src/app`).

## 2) Endpoints y contratos
Nota: en este proyecto **no hay rutas `app/api/*` de Next para chat**. Los endpoints del LLM/chat viven en NestJS (`apps/api`).

### `POST /api/v1/ai/chat`
- Proposito: responder preguntas del asistente contextual con contexto de convocatoria/documento por tenant.
- Request JSON:
```json
{
  "message": "string",
  "callId": "string (optional)",
  "documentId": "string (optional)"
}
```
- Headers requeridos:
  - `x-tenant-id`
  - `x-user-id`
- Response JSON:
```json
{
  "answer": "string",
  "traceId": "string",
  "createdAt": "ISO date"
}
```
- Streaming: **No** (respuesta JSON normal).

### `POST /api/v1/calls/:id/analyze-phase-1-llm`
- Proposito: extraer requisitos de convocatoria con LLM y calcular brechas.
- Request: sin body.
- Response JSON:
```json
{
  "callId": "string",
  "status": "GAP_PENDING | READY_FOR_PHASE_2",
  "requirements": {
    "meta": { "schemaVersion": "call-requirements-v1", "model": "string", "generatedAt": "ISO date" },
    "requirements": {
      "minimumActivities": 0,
      "requiredFormTemplates": 0,
      "requiredEvidenceCount": 0,
      "requiredDeliverables": ["string"],
      "requiresBudget": true,
      "requiresTimeline": true,
      "deadline": "string (optional)",
      "budget": "string (optional)"
    },
    "scoringCriteria": ["string"],
    "constraints": ["string"],
    "evidence": [{ "requirementKey": "string", "quote": "string", "sourceChunkId": "string" }],
    "confidence": "LOW | MEDIUM | HIGH"
  },
  "gapReport": {
    "callId": "string",
    "gaps": [{ "code": "string", "description": "string", "requiredCount": 0, "currentCount": 0 }],
    "blocked": true
  }
}
```
- Streaming: **No**.

### `POST /api/v1/calls/:id/recommend-impact-tasks`
- Proposito: ranking inteligente de tareas de impacto con LLM.
- Request: sin body.
- Response JSON:
```json
{
  "callId": "string",
  "recommendation": {
    "rankedTasks": [{ "taskId": "string", "score": 0, "rationale": "string", "prerequisites": ["string"] }],
    "coverage": { "riskMitigation": 0, "feasibility": 0, "expectedImpact": 0 }
  }
}
```
- Streaming: **No**.

### `POST /api/v1/calls/:id/generate-draft-llm`
- Proposito: generar borrador del anteproyecto con LLM.
- Request: sin body.
- Response JSON:
```json
{
  "callId": "string",
  "documentId": "string",
  "status": "GENERATED_PHASE_2",
  "draft": {
    "sections": [{ "id": "string", "title": "string", "markdown": "string", "evidenceRefs": ["string"] }],
    "qualityChecks": { "missingData": ["string"], "assumptions": ["string"] }
  }
}
```
- Streaming: **No**.

### `GET /api/v1/llm/health`
- Proposito: verificar si el servicio LLM opera en modo OpenAI real o fallback.
- Response JSON (ejemplo):
```json
{
  "ok": true,
  "mode": "openai | fallback",
  "model": "string",
  "reason": "string (optional)",
  "responseSample": "string (optional)"
}
```

## 3) Implementacion OpenAI
- Inicializacion/wrapper: `apps/api/src/modules/llm/llm.service.ts`.
- Metodo de llamada:
  - `callOpenAIJson(...)` -> `POST {OPENAI_BASE_URL}/chat/completions`, `response_format: { type: "json_object" }`, `temperature: 0.2`.
  - `callOpenAIText(...)` -> mismo endpoint, `temperature: 0.3`.
- Modelo: `process.env.LLM_MODEL || "gpt-4.1-mini"`.
- API key: `process.env.OPENAI_API_KEY`.
- Base URL configurable: `process.env.OPENAI_BASE_URL || "https://api.openai.com/v1"`.
- Function calling/tools: **No implementado**.
- Retrieval/embeddings: **No implementado**.
- Fallback: si falta `OPENAI_API_KEY` o falla OpenAI, se usan metodos mock internos (`chatAssistantMock`, `extractRequirementsMock`, etc.).

## 4) Frontend del chat
- Componente clave: `apps/web/src/components/ai-bubble.tsx`.
- Cliente HTTP: `apps/web/src/lib/api.ts` (`api.aiChat(...)` -> `POST /ai/chat`).
- Ruta de pantalla principal (donde vive la burbuja): `apps/web/src/app/page.tsx`.
- Estado principal del chat en UI:
  - `open`: visibilidad de burbuja.
  - `question`: input del usuario.
  - `answer`: ultima respuesta.
- Payload de llamada desde frontend:
```json
{
  "message": "string",
  "callId": "string (optional)",
  "documentId": "string (optional)"
}
```
- Manejo de streaming en frontend: **No** (espera JSON completo).

## 5) Seguridad y entorno
- Variables de entorno (sin valores):
  - Backend (`apps/api`): `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `LLM_MODEL`, `PORT`.
  - Frontend (`apps/web`): `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_TENANT_ID`, `NEXT_PUBLIC_USER_ID`, `NEXT_PUBLIC_DEFAULT_DOCUMENT_ID`.
- Protecciones:
  - Multitenancy por headers obligatorios (`x-tenant-id`, `x-user-id`) validados en `apps/api/src/common/request-context.ts`.
  - Consultas de chat validan pertenencia por tenant de `callId`/`documentId`.
- Middleware/auth/rate-limit:
  - Auth formal (JWT/session): **No implementado en este punto**.
  - Rate limiting: **No implementado**.
  - CORS: habilitado globalmente (`app.enableCors()`).
  - Logging: logger de Nest + trazas IA (`aiTrace` en DB).

## 6) Dependencias relevantes
- Directamente vinculadas al stack LLM/chat:
  - Backend: uso de `fetch` nativo (sin SDK OpenAI).
  - `@nestjs/common`, `@nestjs/core`, `class-validator`, `@prisma/client` (validacion, API, persistencia de trazas/contexto).
  - Frontend: `@tanstack/react-query` (estado de requests chat/flujo).
- Streaming/tools SDK especificos: **ninguno actualmente**.

## 7) Fragmentos clave

### Handler principal de chat (endpoint)
```ts
// apps/api/src/modules/ai/ai.controller.ts
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('chat')
  chat(@Req() req: Request, @Body() dto: ChatDto) {
    const ctx = getRequestContext(req.headers);
    return this.aiService.chat(ctx.tenantId, ctx.userId, dto);
  }
}
```

### Wrapper OpenAI
```ts
// apps/api/src/modules/llm/llm.service.ts (extracto)
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

  const json = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return json.choices?.[0]?.message?.content?.trim() || '';
}
```

### Componente React principal del chat
```tsx
// apps/web/src/components/ai-bubble.tsx (extracto)
export function AIBubble({ documentId, callId }: AIBubbleProps) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');

  async function ask() {
    const result = await api.aiChat(question, { documentId, callId });
    setAnswer(result.answer || 'Sin respuesta.');
  }

  return (
    <div>
      {open && <textarea value={question} onChange={(e) => setQuestion(e.target.value)} />}
      <button onClick={ask}>Enviar</button>
      <pre>{answer}</pre>
      <button onClick={() => setOpen((v) => !v)}>IA</button>
    </div>
  );
}
```

## 8) Notas de integracion
### Reutilizable sin cambios (o casi)
- Contrato HTTP del backend (`POST /api/v1/ai/chat`) y payload.
- Logica de seleccion de contexto por `callId`/`documentId` en `AiService`.
- Wrapper OpenAI en `LlmService` (puede moverse tal cual a otro backend Node).
- Componente UI `AIBubble` como base funcional.

### Dependiente de Next.js / adaptaciones requeridas
- No depende de APIs Next para chat, pero el frontend actual esta montado en `app/page.tsx` (App Router).
- Para React + Vite:
  - Copiar `AIBubble` a un componente React normal.
  - Migrar `api.ts` y reemplazar `NEXT_PUBLIC_*` por `import.meta.env.VITE_*`.
  - Mantener headers `x-tenant-id` y `x-user-id` en cada request.
  - Configurar `VITE_API_URL` apuntando al backend NestJS.

### Checklist corto de migracion a Vite
1. Crear `src/lib/api.ts` en Vite con el metodo `aiChat`.
2. Definir `VITE_API_URL`, `VITE_TENANT_ID`, `VITE_USER_ID`.
3. Copiar `AIBubble` y montarlo en layout global.
4. Verificar CORS entre Vite dev server y Nest API.
5. Probar `POST /api/v1/ai/chat` y `GET /api/v1/llm/health`.
