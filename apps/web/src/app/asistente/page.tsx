'use client';

import { useMemo, useState } from 'react';
import { Suspense } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useSearchParams } from 'next/navigation';

type FormFieldType = 'text' | 'textarea' | 'number' | 'date' | 'checkbox' | 'select';

type PendingForm = {
  activityId: string;
  activityName: string;
  formTemplateId: string;
  formTemplateName: string;
  schemaJson?: {
    fields?: Array<{
      key: string;
      label?: string;
      type?: FormFieldType;
      required?: boolean;
      options?: string[];
    }>;
  };
};

function AsistentePageContent() {
  const params = useSearchParams();
  const queryClient = useQueryClient();
  const token = params.get('token') || '';
  const callId = params.get('callId') || '';

  const [assistantName, setAssistantName] = useState('');
  const [selectedKey, setSelectedKey] = useState('');
  const [values, setValues] = useState<Record<string, string | number | boolean>>({});
  const [message, setMessage] = useState('');

  const pendingQuery = useQuery({
    queryKey: ['publicPendingForms', callId, token],
    queryFn: () => api.publicListPendingForms(callId, token),
    enabled: Boolean(callId && token),
  });

  const pendingForms = (pendingQuery.data?.pendingForms || []) as PendingForm[];
  const completedItems = (pendingQuery.data?.completedFormItems || []) as Array<{
    activityId: string;
    activityName: string;
    formTemplateId: string;
    formTemplateName: string;
  }>;

  const selectedForm = useMemo(() => {
    if (!pendingForms.length) return undefined;
    const first = pendingForms[0];
    const defaultKey = `${first.activityId}:${first.formTemplateId}`;
    const key = selectedKey || defaultKey;
    return pendingForms.find((item) => `${item.activityId}:${item.formTemplateId}` === key) || first;
  }, [pendingForms, selectedKey]);

  const submitMutation = useMutation({
    mutationFn: () => {
      if (!selectedForm) throw new Error('No hay formulario pendiente seleccionado.');

      const missing = (selectedForm.schemaJson?.fields || [])
        .filter((field) => field.required)
        .filter((field) => {
          const value = values[field.key];
          if (field.type === 'checkbox') return value !== true;
          return value === undefined || value === null || (typeof value === 'string' && value.trim().length === 0);
        })
        .map((field) => field.label || field.key);

      if (missing.length) {
        throw new Error(`Completa los campos obligatorios: ${missing.join(', ')}`);
      }

      return api.publicSubmitCallForm(callId, {
        token,
        activityId: selectedForm.activityId,
        formTemplateId: selectedForm.formTemplateId,
        response: values,
        assistantName: assistantName.trim() || undefined,
      });
    },
    onSuccess: () => {
      setMessage('Formulario enviado correctamente. Gracias por tu apoyo.');
      setValues({});
      setSelectedKey('');
      queryClient.invalidateQueries({ queryKey: ['publicPendingForms', callId, token] });
    },
    onError: (error) => {
      const text = error instanceof Error ? error.message : 'No se pudo enviar el formulario.';
      setMessage(text);
    },
  });

  function setFieldValue(key: string, value: string | number | boolean) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  if (!callId || !token) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <h1 className="font-heading text-2xl font-semibold text-slate-900">Asistencia de formularios</h1>
        <p className="mt-2 text-sm text-rose-700">Enlace incompleto. Verifica que el QR incluya `callId` y `token`.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="font-heading text-2xl font-semibold text-slate-900">Asistencia de formularios</h1>
      <p className="mt-2 text-sm text-slate-600">
        Convocatoria: <strong>{pendingQuery.data?.callTitle || callId}</strong>
      </p>

      <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
        <label className="block text-xs font-semibold text-slate-700">Tu nombre (opcional)</label>
        <input
          className="mt-1 w-full rounded border border-slate-300 p-2 text-sm"
          placeholder="Nombre del asistente"
          value={assistantName}
          onChange={(e) => setAssistantName(e.target.value)}
        />
      </div>

      <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
        <p className="text-xs font-semibold text-slate-700">Formularios ya completados</p>
        {completedItems.length ? (
          <ul className="mt-2 list-disc pl-5 text-sm text-emerald-700">
            {completedItems.map((item) => (
              <li key={`done-${item.activityId}-${item.formTemplateId}`}>
                {item.activityName} {' -> '} {item.formTemplateName}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-slate-500">Aun no hay formularios completados.</p>
        )}
      </div>

      <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
        <p className="text-xs font-semibold text-slate-700">Formularios pendientes</p>
        {pendingQuery.isLoading ? (
          <p className="mt-2 text-sm text-slate-500">Cargando formularios...</p>
        ) : pendingForms.length ? (
          <>
            <select
              className="mt-2 w-full rounded border border-slate-300 p-2 text-sm"
              value={selectedKey || `${pendingForms[0].activityId}:${pendingForms[0].formTemplateId}`}
              onChange={(e) => {
                setSelectedKey(e.target.value);
                setValues({});
                setMessage('');
              }}
            >
              {pendingForms.map((item) => {
                const key = `${item.activityId}:${item.formTemplateId}`;
                return (
                  <option key={key} value={key}>
                    {item.activityName} {' -> '} {item.formTemplateName}
                  </option>
                );
              })}
            </select>

            {selectedForm?.schemaJson?.fields?.length ? (
              <div className="mt-3 space-y-2">
                {selectedForm.schemaJson.fields.map((field) => {
                  const fieldType = field.type || 'text';
                  const value = values[field.key];
                  const label = field.label || field.key;
                  return (
                    <div key={field.key}>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                        {label} {field.required ? '*' : ''}
                      </label>
                      {fieldType === 'textarea' ? (
                        <textarea
                          className="w-full rounded border border-slate-300 p-2 text-sm"
                          value={String(value || '')}
                          onChange={(e) => setFieldValue(field.key, e.target.value)}
                        />
                      ) : fieldType === 'number' ? (
                        <input
                          type="number"
                          className="w-full rounded border border-slate-300 p-2 text-sm"
                          value={value === undefined ? '' : String(value)}
                          onChange={(e) => setFieldValue(field.key, Number(e.target.value))}
                        />
                      ) : fieldType === 'date' ? (
                        <input
                          type="date"
                          className="w-full rounded border border-slate-300 p-2 text-sm"
                          value={String(value || '')}
                          onChange={(e) => setFieldValue(field.key, e.target.value)}
                        />
                      ) : fieldType === 'checkbox' ? (
                        <label className="flex items-center gap-2 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={Boolean(value)}
                            onChange={(e) => setFieldValue(field.key, e.target.checked)}
                          />
                          Confirmo este campo
                        </label>
                      ) : fieldType === 'select' ? (
                        <select
                          className="w-full rounded border border-slate-300 p-2 text-sm"
                          value={String(value || '')}
                          onChange={(e) => setFieldValue(field.key, e.target.value)}
                        >
                          <option value="">Selecciona una opcion</option>
                          {(field.options || []).map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          className="w-full rounded border border-slate-300 p-2 text-sm"
                          value={String(value || '')}
                          onChange={(e) => setFieldValue(field.key, e.target.value)}
                        />
                      )}
                    </div>
                  );
                })}
                <button
                  className="rounded bg-slate-900 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:bg-slate-400"
                  onClick={() => submitMutation.mutate()}
                  disabled={submitMutation.isPending}
                  type="button"
                >
                  {submitMutation.isPending ? 'Enviando...' : 'Enviar formulario'}
                </button>
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-600">Este formulario no tiene campos configurados.</p>
            )}
          </>
        ) : (
          <p className="mt-2 text-sm text-emerald-700">No hay formularios pendientes. Todo esta completo.</p>
        )}
      </div>

      {message ? (
        <p className="mt-4 rounded border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">{message}</p>
      ) : null}
    </main>
  );
}

export default function AsistentePage() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-3xl p-6 text-sm text-slate-500">Cargando...</main>}>
      <AsistentePageContent />
    </Suspense>
  );
}
