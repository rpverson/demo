# Runbook: Desarrollo local y migraciones

## Requisitos
- Node.js + npm
- PostgreSQL y Redis (via docker compose recomendado)

## Arranque local
1. Infra:
   - `docker compose -f /Users/admon/Desktop/vibe/infra/docker-compose.yml up -d`
2. Dependencias:
   - `cd /Users/admon/Desktop/vibe && npm install`
3. Prisma:
   - `npm run prisma:generate`
   - `npm run prisma:migrate -w @ambiental/api -- --name <nombre_migracion>`
4. Seed opcional:
   - `npm run seed`
5. Apps:
   - `npm run dev:api`
   - `npm run dev:web`

## Variables de entorno recomendadas

## API (`apps/api/.env`)
- `DATABASE_URL`
- `OPENAI_API_KEY` (opcional)
- `OPENAI_BASE_URL` (opcional)
- `LLM_MODEL` (opcional)
- `AUTH_SECRET`
- `AUTH_ADMIN_USERNAME`
- `AUTH_ADMIN_PASSWORD`
- `AUTH_USER_USERNAME`
- `AUTH_USER_PASSWORD`
- `AUTH_TOKEN_TTL_SECONDS`

## Web (`apps/web/.env.local`)
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_TENANT_ID`
- `NEXT_PUBLIC_USER_ID`
- `NEXT_PUBLIC_USER_ROLE`
- `NEXT_PUBLIC_DEFAULT_DOCUMENT_ID` (opcional)

## Problemas comunes

## Error de Prisma al compilar
- Ejecutar:
  - `npm run prisma:generate`
- Si hay cambio de schema:
  - `npm run prisma:migrate -w @ambiental/api -- --name <cambio>`

## API responde Unauthorized
- Verificar login y `x-auth-token`.
- Revisar expiracion del token.

## Usuario no desbloquea FASE_2
- Revisar:
  - brechas de `GET /calls/:id/gaps`
  - pendientes de `GET /calls/:id/pending-forms`
  - vinculos actividad-formulario en catalogos.

## Cambios de UI no se ven
- Forzar recarga del navegador (`Cmd+Shift+R`).
