# Arquitectura General

## Objetivo
Plataforma SaaS multi-tenant para gestionar convocatorias ambientales con:
- analisis FASE_1 (requisitos + brechas),
- generacion FASE_2 (anteproyecto),
- editor web tipo Word,
- asistencia IA contextual.

## Componentes
- `apps/web` (Next.js): UI, flujo de negocio, editor, burbuja IA.
- `apps/api` (NestJS): API REST, reglas de negocio, control de roles, persistencia.
- `PostgreSQL + Prisma`: datos transaccionales.
- `OpenAI (opcional)`: analisis/redaccion inteligente; fallback local si no hay API key.

## Flujo de alto nivel
1. Usuario importa convocatoria (`URL/PDF/DOCX/MD`).
2. Sistema ejecuta FASE_1 (manual admin o automatico user).
3. Si hay brechas, muestra faltantes y formularios pendientes.
4. Usuario completa formularios requeridos.
5. Reintenta analisis; si cumple minimos, habilita FASE_2.
6. Genera/edita anteproyecto y exporta PDF.

## Seguridad
- Multi-tenant por `tenantId`.
- Autenticacion por token firmado (`x-auth-token`).
- Roles:
  - `ADMIN`: control total.
  - `USER`: flujo guiado y acotado.

## Principios de diseño actuales
- Logica de negocio en servicios Nest (`CallsService`, `DocumentsService`, etc.).
- Contratos API simples y versionados en `/api/v1`.
- Validacion de entrada con `class-validator`.
- Restriccion de permisos tanto en frontend como backend.
