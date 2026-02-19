# Modelo de Datos (Prisma)

Archivo fuente: `/Users/admon/Desktop/vibe/prisma/schema.prisma`

## Entidades clave

## `CallForProposal`
- Convocatoria importada.
- Campos clave:
  - `sourceType`, `sourceUrl/sourceStorageKey`, `extractedText`
  - `status` (`IMPORTED`, `GAP_PENDING`, `READY_FOR_PHASE_2`, etc.)
  - `phase1Requirements` (JSON)
  - `phase1GapReport` (JSON)

## `Activity`
- Actividad de base de conocimiento.
- `documented` indica si cuenta como evidencia base.

## `FormTemplate`
- Formato configurable por `schemaJson`.
- `schemaJson.fields[]` define campos, tipo y si son obligatorios.

## `ActivityFormTemplate`
- Relacion explicita actividad <-> formulario.
- Permite modelar: una actividad exige varios formularios.

## `CallActivityFormResponse`
- Respuesta de formulario por:
  - convocatoria (`callId`)
  - actividad (`activityId`)
  - formulario (`formTemplateId`)
  - usuario (`userId`)
- Usada para desbloquear FASE_2 en flujos guiados.

## `ImpactTask`
- Catalogo de tareas de impacto.

## `DocumentDraft`
- Anteproyecto editable (markdown + versionado + lock).

## `DocumentComment`, `DocumentChangeSet`, `ExportArtifact`
- Auditoria colaborativa y exportaciones versionadas.

## `AiTrace`
- Trazas de prompts/respuestas IA por tenant.

## Relaciones relevantes
- `CallForProposal 1 - 1 DocumentDraft`
- `Activity N - N FormTemplate` via `ActivityFormTemplate`
- `CallForProposal 1 - N CallActivityFormResponse`
- `Activity 1 - N CallActivityFormResponse`
- `FormTemplate 1 - N CallActivityFormResponse`

## Invariantes de negocio
- No se pasa a FASE_2 con brechas abiertas.
- Usuario no administra catalogos.
- Reglas contextuales (ej. convocatoria de rio) exigen actividad y formularios vinculados/completados.
- Cada exportacion PDF representa una version de documento.
