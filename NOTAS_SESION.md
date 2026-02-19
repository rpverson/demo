# NOTAS_SESION

## Fecha
- 2026-02-16

## Objetivo del proyecto
Construir una plataforma web SaaS multi-tenant para gestionar convocatorias ambientales con flujo E2E:
- Ingesta de convocatoria (URL/PDF/DOCX/MD)
- FASE_1 (analisis y brechas)
- FASE_2 (generacion de anteproyecto)
- Editor tipo Word en web
- Exportacion PDF
- Burbuja IA contextual

## Estado actual (implementado)

### Backend (NestJS)
- Endpoints de convocatorias:
  - `POST /api/v1/calls/import`
  - `POST /api/v1/calls/:id/analyze-phase-1`
  - `GET /api/v1/calls/:id/gaps`
  - `POST /api/v1/calls/:id/minimum-plan/confirm`
  - `POST /api/v1/calls/:id/generate-phase-2`
- Endpoints de documentos:
  - `GET /api/v1/documents/:id`
  - `PUT /api/v1/documents/:id/content`
  - `POST /api/v1/documents/:id/lock`
  - `POST /api/v1/documents/:id/unlock`
  - `POST /api/v1/documents/:id/comments`
  - `POST /api/v1/documents/:id/review/accept-change`
- Exportacion PDF:
  - `POST /api/v1/exports/:documentId/pdf`
  - Genera PDF basico y lo devuelve como `pdfBase64` para descarga inmediata en frontend.
- IA contextual:
  - `POST /api/v1/ai/chat`
  - Soporta contexto opcional por `callId` y/o `documentId`.

### Frontend (Next.js)
- Pantalla unica con flujo completo:
  - Importar convocatoria
  - Ejecutar FASE_1
  - Confirmar minimos
  - Generar FASE_2
  - Editar documento (TipTap)
  - Guardar version
  - Exportar PDF
- Burbuja IA activa todo el tiempo (no solo en FASE_2).
- Soporte para carga de convocatoria desde archivo `.md`.
- Mensajes de estado/error visibles para acciones clave.
- Botones de FASE bloqueados cuando no existe `callId` para evitar rutas invalidas.

### Modelo de datos
- Prisma multi-tenant en `prisma/schema.prisma`.
- `SourceType` incluye: `URL`, `PDF`, `DOCX`, `MD`.

## Como funciona hoy FASE_1
- Regla actual (stub): requiere minimo 5 actividades documentadas.
- Si no cumple:
  - estado `GAP_PENDING`
  - `phase1GapReport.blocked = true`
- Si cumple:
  - estado `READY_FOR_PHASE_2`
- Nota: aun no hay NLP real del contenido de convocatoria; el analisis es reglado.

## Pendientes recomendados (siguiente sesion)
1. Implementar analisis real de convocatoria (parser por tipo + extraccion estructurada de requisitos).
2. Mejorar exportador PDF (plantilla formal, paginacion, encabezado/pie, tablas).
3. Agregar estado visual del lock con expiracion en tiempo real.
4. Endurecer seguridad (auth JWT real, RBAC por roles, no solo headers de demo).
5. Agregar pruebas automatizadas E2E y unitarias.

## Comandos para retomar

### Levantar infraestructura
```bash
cd /Users/admon/Desktop/vibe
docker compose -f infra/docker-compose.yml up -d
```

### Dependencias y prisma
```bash
cd /Users/admon/Desktop/vibe
npm install
npm run prisma:generate
npm run prisma:migrate
npm run seed
```

### Ejecutar apps
```bash
cd /Users/admon/Desktop/vibe
npm run dev:api
npm run dev:web
```

## Verificaciones realizadas hoy
- `npm run build -w @ambiental/api` OK
- `npm run build -w @ambiental/web` OK

## Archivos clave tocados hoy
- `apps/api/src/modules/calls/*`
- `apps/api/src/modules/documents/*`
- `apps/api/src/modules/exports/exports.service.ts`
- `apps/api/src/modules/ai/*`
- `apps/web/src/app/page.tsx`
- `apps/web/src/components/ai-bubble.tsx`
- `apps/web/src/components/word-editor.tsx`
- `apps/web/src/lib/api.ts`
- `prisma/schema.prisma`
- `README.md`

## Nota de continuidad
Si se reanuda en otro hilo de Codex, usar este archivo como contexto inicial.
