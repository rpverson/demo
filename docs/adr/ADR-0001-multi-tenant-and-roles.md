# ADR-0001: Multi-tenant y control de roles

## Estado
Aceptado

## Contexto
La plataforma necesita aislar datos por cliente y restringir acciones segun perfil.

## Decision
- El contexto de acceso se resuelve por token firmado (`x-auth-token`).
- El token incluye `tenantId`, `userId`, `role`.
- Roles activos:
  - `ADMIN`: acceso completo.
  - `USER`: flujo guiado (sin admin de catalogos ni acciones tecnicas avanzadas).

## Consecuencias
- Seguridad de negocio aplicada en backend.
- Frontend adapta UI por rol para UX.
- Toda consulta/escritura se ejecuta en ambito tenant.
