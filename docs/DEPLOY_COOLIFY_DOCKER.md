# Deploy en Coolify con Docker Compose

## 1) Archivos incluidos

- `docker-compose.yml`: stack completo (`web`, `api`, `postgres`, `redis`).
- `Dockerfile.api`: build/run de NestJS.
- `Dockerfile.web`: build/run de Next.js.
- `.env.compose.example`: variables base.

## 2) Preparar variables

1. Copia `.env.compose.example` y define valores reales en Coolify (Environment Variables).
2. En produccion, define `NEXT_PUBLIC_API_URL` con dominio publico de API, por ejemplo:
   - `https://api.tudominio.com/api/v1`

## 3) Crear proyecto en Coolify

1. New Resource -> Docker Compose.
2. Selecciona este repo.
3. File path: `docker-compose.yml`.
4. Agrega variables de entorno del archivo ejemplo.
5. Configura dominios:
   - `web` -> `app.tudominio.com`
   - `api` -> `api.tudominio.com`

## 4) Primer deploy

1. Deploy.
2. Espera a que `postgres` esté healthy.
3. El contenedor `api` ejecuta migraciones al iniciar con:
   - `npm run prisma:migrate:deploy -w @ambiental/api`

## 5) Cargar datos demo (opcional)

Ejecuta una vez dentro del contenedor `api`:

```bash
npm run seed -w @ambiental/api
```

## 6) Verificación

1. API health LLM:
   - `https://api.tudominio.com/api/v1/llm/health`
2. Web:
   - `https://app.tudominio.com`
3. Login demo:
   - Admin: `admin / admin123`
   - Usuario: `usuario / user123`

## 7) Notas

- Si cambia `NEXT_PUBLIC_API_URL`, reconstruye `web` (es variable de build para el frontend).
- Cambia secretos y contraseñas por valores seguros antes de exponer públicamente.
