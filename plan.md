# Plan Maestro Ajustado: Plataforma Web con Editor Tipo Word Integrado

## Resumen
Se implementará una plataforma SaaS multi-tenant con flujo E2E completo para convocatorias ambientales, sustituyendo el “canvas” por un **editor web tipo Word**.  
El editor será de nivel **profesional completo** en MVP, con **bloqueo de edición por documento (un editor a la vez)** y formato fuente **Markdown** (según tu elección), con render/edición WYSIWYG en web y exportación PDF final.

## Ajuste Principal de Producto
1. Se elimina la noción de lienzo libre (canvas gráfico).
2. Se adopta editor documental WYSIWYG tipo Word:
- Paginado visual.
- Estilos (títulos, subtítulos, cuerpo, citas).
- Tablas, imágenes, listas, enlaces.
- Encabezado y pie de página.
- Comentarios.
- Control de cambios.
3. El contenido interno se almacenará en Markdown + metadatos estructurales para trazabilidad/versionado, y se renderizará en editor rico.

## Alcance MVP (cerrado)
1. Gestión de elementos base versionados:
- `FormTemplate`, `Activity`, `ImpactTask`.
2. Flujo convocatoria:
- Ingesta por URL, PDF y DOCX.
- FASE_1: análisis de requerimientos + brechas + lista mínima de actividades faltantes.
- Bloqueo de avance hasta cubrir mínimos.
3. FASE_2:
- Generación automática de anteproyecto.
- Inclusión trazable de tareas de impacto.
4. Editor tipo Word en web:
- Edición integral del anteproyecto.
- Comentarios y control de cambios.
- Historial de versiones y restauración.
- Bloqueo de edición (lock) por documento.
5. Exportación:
- PDF descargable de la versión aprobada.
6. Burbuja IA contextual:
- Presente en todo el flujo para dudas, consulta de base, y asistencia de redacción/edición.

## Arquitectura y Stack
1. Frontend:
- `Next.js + TypeScript + Tailwind + React Query`.
- Editor WYSIWYG profesional con `TipTap (ProseMirror)` + extensiones avanzadas (track changes, comments, tables, pagination-like UX).
2. Backend:
- `NestJS + TypeScript`, REST `/api/v1`.
3. Datos:
- `PostgreSQL + Prisma`.
- `Redis + BullMQ` para procesamiento asíncrono.
- `pgvector` para RAG.
4. Documentos:
- Modelo canónico en Markdown.
- Transformadores Markdown <-> AST del editor <-> HTML/PDF.
5. Infra:
- `AWS ECS/Fargate`, `S3`, JWT + RBAC + auditoría.

## APIs/Interfaces Públicas
1. Nuevas/ajustadas entidades:
- `DocumentDraft` (markdown_source, ast_snapshot, version, lock_owner, lock_expires_at).
- `DocumentComment`, `DocumentChangeSet`.
2. Endpoints clave:
- `GET /documents/:id`
- `PUT /documents/:id/content`
- `POST /documents/:id/lock`
- `POST /documents/:id/unlock`
- `POST /documents/:id/comments`
- `POST /documents/:id/review/accept-change`
- `POST /exports/:documentId/pdf`
3. Integración flujo:
- `POST /calls/:id/analyze-phase-1`
- `POST /calls/:id/generate-phase-2` -> crea `DocumentDraft` editable.

## Flujo Funcional
1. Usuario registra convocatoria (URL/PDF/DOCX).
2. Sistema ejecuta FASE_1 y genera brechas.
3. Si faltan actividades, crea plan mínimo y bloquea avance.
4. Cumplidos mínimos, genera anteproyecto (FASE_2).
5. Usuario abre editor tipo Word, ajusta contenido con IA contextual.
6. Usuario revisa cambios/comentarios.
7. Usuario exporta PDF final versionado.

## Reglas de Negocio
1. No hay exportación final sin mínimos FASE_1 cumplidos.
2. Un solo editor activo por documento (lock temporal renovable).
3. Recomendaciones IA y cambios quedan auditados.
4. Cada PDF corresponde a una versión inmutable.

## Pruebas y Aceptación
1. Editor:
- Formato avanzado, tablas, imágenes, encabezado/pie.
- Comentarios + control de cambios (crear/aceptar/rechazar).
- Persistencia correcta Markdown <-> editor.
2. Concurrencia:
- Lock adquirido/rechazado/liberado.
- Recuperación ante sesión caída (expiración lock).
3. Flujo FASE_1/FASE_2:
- Casos con y sin brechas.
- Trazabilidad de tareas de impacto.
4. Exportación:
- Fidelidad visual del documento.
- Metadatos de versión correctos.
5. IA:
- Respuestas contextualizadas por tenant y documento.
- Sin fuga de datos entre tenants.

## Supuestos y Defaults
1. Idioma principal: español.
2. Modelo: SaaS multi-tenant.
3. Editor MVP: profesional completo.
4. Colaboración MVP: un editor a la vez (sin coedición en tiempo real).
5. Formato fuente interno: Markdown (por tu preferencia), con capa WYSIWYG para experiencia tipo Word.
