# Modulos NestJS

## `AuthModule`
- Archivo: `/Users/admon/Desktop/vibe/apps/api/src/modules/auth`
- Responsabilidad:
  - login basico usuario/password.
  - emision de token firmado con rol y expiracion.
- Endpoint:
  - `POST /api/v1/auth/login`

## `CallsModule`
- Archivo: `/Users/admon/Desktop/vibe/apps/api/src/modules/calls`
- Responsabilidad:
  - importacion y estado de convocatorias.
  - analisis FASE_1.
  - deteccion de brechas.
  - proceso automatico para usuario.
  - generacion FASE_2.
  - formularios pendientes/completados por convocatoria.
- Endpoints principales:
  - `GET /api/v1/calls`
  - `POST /api/v1/calls/import`
  - `POST /api/v1/calls/:id/analyze-phase-1`
  - `POST /api/v1/calls/:id/analyze-phase-1-llm`
  - `GET /api/v1/calls/:id/gaps`
  - `GET /api/v1/calls/:id/pending-forms`
  - `POST /api/v1/calls/:id/forms/submit`
  - `POST /api/v1/calls/:id/auto-process`

## `ActivitiesModule`
- Archivo: `/Users/admon/Desktop/vibe/apps/api/src/modules/activities`
- Responsabilidad:
  - CRUD de actividades.
  - vinculos actividad <-> formulario.
- Endpoints:
  - `GET/POST/PATCH/DELETE /api/v1/activities`
  - `GET /api/v1/activities/:id/form-templates`
  - `POST /api/v1/activities/:id/form-templates`
  - `DELETE /api/v1/activities/:id/form-templates/:formTemplateId`

## `FormTemplatesModule`
- Archivo: `/Users/admon/Desktop/vibe/apps/api/src/modules/form-templates`
- Responsabilidad:
  - CRUD de formatos con `schemaJson` editable.
- Endpoints:
  - `GET/POST/PATCH/DELETE /api/v1/form-templates`

## `ImpactTasksModule`
- Archivo: `/Users/admon/Desktop/vibe/apps/api/src/modules/impact-tasks`
- Responsabilidad:
  - CRUD de tareas de impacto.
- Endpoints:
  - `GET/POST/PATCH/DELETE /api/v1/impact-tasks`

## `DocumentsModule`
- Archivo: `/Users/admon/Desktop/vibe/apps/api/src/modules/documents`
- Responsabilidad:
  - obtener/editar documento.
  - lock/unlock.
  - comentarios y accept-change.
- Endpoints:
  - `GET /api/v1/documents/:id`
  - `PUT /api/v1/documents/:id/content`
  - `POST /api/v1/documents/:id/lock`
  - `POST /api/v1/documents/:id/unlock`
  - `POST /api/v1/documents/:id/comments`
  - `POST /api/v1/documents/:id/review/accept-change`

## `ExportsModule`
- Archivo: `/Users/admon/Desktop/vibe/apps/api/src/modules/exports`
- Responsabilidad:
  - exportacion PDF de documento.
- Endpoint:
  - `POST /api/v1/exports/:documentId/pdf`

## `AiModule`
- Archivo: `/Users/admon/Desktop/vibe/apps/api/src/modules/ai`
- Responsabilidad:
  - chat IA contextual por tenant/call/document.
- Endpoint:
  - `POST /api/v1/ai/chat`

## `LlmModule`
- Archivo: `/Users/admon/Desktop/vibe/apps/api/src/modules/llm`
- Responsabilidad:
  - wrapper OpenAI + fallback local.
  - extraccion requisitos, ranking tareas, redaccion draft.
- Endpoint:
  - `GET /api/v1/llm/health`
