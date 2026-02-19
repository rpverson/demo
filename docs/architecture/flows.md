# Flujos E2E

## 1. Flujo usuario (guiado)
1. Login (`/auth/login`).
2. Importa convocatoria.
3. Selecciona convocatoria en Analisis.
4. Ejecuta `Activar analisis automatico`.
5. Si hay brechas:
   - ve lista de faltantes.
   - ve checklist `[x]/[ ]` de formularios.
   - completa formularios pendientes desde la misma vista.
6. Reintenta analisis automatico.
7. Si ya no hay brechas, se habilita fase de edicion.

## 2. Flujo admin (control total)
1. Login admin.
2. Configura catalogos:
   - actividades,
   - tareas impacto,
   - formatos (schemaJson),
   - vinculos actividad-formulario.
3. Ejecuta analisis FASE_1 manual/IA.
4. Confirma minimos y genera FASE_2.
5. Edita documento, comenta, versiona y exporta PDF.

## 3. Flujo de formularios para desbloqueo
1. Backend detecta que convocatoria requiere actividad contextual.
2. Busca formularios vinculados a esa actividad.
3. Consulta respuestas ya guardadas en `CallActivityFormResponse`.
4. Expone:
   - pendientes (`pendingForms`)
   - completados (`completedFormItems`)
5. Al enviar respuesta, valida campos obligatorios del schema.
6. Si cumple reglas y minimos, FASE_2 se desbloquea.

## 4. Flujo IA contextual
1. Usuario abre burbuja IA.
2. Frontend envia `message + callId/documentId`.
3. `AiService` recupera contexto del tenant.
4. `LlmService` responde con OpenAI o fallback.
5. Se guarda traza en `AiTrace`.
