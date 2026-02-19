# Plataforma Convocatorias Ambientales (MVP)

Implementacion inicial de una plataforma SaaS multi-tenant con:

- Flujo convocatoria (ingesta, analisis FASE_1, generacion FASE_2)
- Ingesta por URL, PDF, DOCX y archivo Markdown (`.md`)
- Editor web tipo Word integrado (TipTap)
- Bloqueo de edicion por documento (single editor lock)
- Comentarios, cambios, versionado y exportacion PDF
- Burbuja IA contextual (API stub segura por tenant)

## Estructura

- `apps/api`: Backend NestJS + Prisma + PostgreSQL + Redis
- `apps/web`: Frontend Next.js + TipTap + React Query
- `packages/shared`: Tipos compartidos
- `prisma/schema.prisma`: modelo de datos multi-tenant
- `infra/docker-compose.yml`: servicios locales (postgres, redis)

## Reglas implementadas en backend

1. No se exporta PDF si FASE_1 tiene brechas sin resolver.
2. Un editor a la vez por documento mediante lock temporal renovable.
3. Trazabilidad de recomendaciones IA y cambios en historial/auditoria.
4. Toda exportacion se asocia a una version inmutable del documento.

## Inicio rapido

1. Configurar variables en `apps/api/.env` y `apps/web/.env.local`.
   - Para LLM real: definir `OPENAI_API_KEY` en `apps/api/.env`.
2. Levantar infraestructura: `docker compose -f infra/docker-compose.yml up -d`
3. Instalar dependencias: `npm install`
4. Prisma:
   - `npm run prisma:generate`
   - `npm run prisma:migrate`
5. Seed demo:
   - `npm run seed`
6. Levantar apps:
   - API: `npm run dev:api`
   - Web: `npm run dev:web`

## Endpoints MVP clave

- `POST /api/v1/calls/import`
- `POST /api/v1/calls/:id/analyze-phase-1`
- `POST /api/v1/calls/:id/analyze-phase-1-llm`
- `GET /api/v1/calls/:id/analysis`
- `POST /api/v1/calls/:id/minimum-plan/confirm`
- `POST /api/v1/calls/:id/recommend-impact-tasks`
- `POST /api/v1/calls/:id/generate-draft-llm`
- `GET /api/v1/calls/:id/draft-quality`
- `POST /api/v1/calls/:id/generate-phase-2`
- `GET /api/v1/documents/:id`
- `PUT /api/v1/documents/:id/content`
- `POST /api/v1/documents/:id/lock`
- `POST /api/v1/documents/:id/unlock`
- `POST /api/v1/documents/:id/comments`
- `POST /api/v1/documents/:id/review/accept-change`
- `POST /api/v1/exports/:documentId/pdf`
- `POST /api/v1/ai/chat`
- `GET /api/v1/llm/health`
- `PATCH /api/v1/activities/:id` / `DELETE /api/v1/activities/:id`
- `PATCH /api/v1/impact-tasks/:id` / `DELETE /api/v1/impact-tasks/:id`
- `PATCH /api/v1/form-templates/:id` / `DELETE /api/v1/form-templates/:id`
