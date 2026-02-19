# ADR-0002: Lock de documento y versionado

## Estado
Aceptado

## Contexto
Se requiere evitar conflictos de edicion en el MVP y mantener trazabilidad.

## Decision
- Un solo editor activo por documento (`lockOwner`, `lockExpiresAt`).
- Guardado incrementa `version`.
- Exportacion PDF se asocia a una version inmutable.

## Consecuencias
- Menor complejidad que coedicion en tiempo real.
- Historial y auditoria consistentes.
- Base para evolucion futura a colaboracion simultanea.
