'use client';

import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { WordEditor } from '@/components/word-editor';
import { api, clearSessionContext, setSessionContext } from '@/lib/api';
import { AIBubble } from '@/components/ai-bubble';
import { htmlToMarkdown, markdownToHtml } from '@/lib/markdown';

type SourceType = 'URL' | 'PDF' | 'DOCX' | 'MD';
type EditEntityType = 'activity' | 'impactTask' | 'formTemplate';
type SectionKey = 'home' | 'convocatoria' | 'analisis' | 'catalogos' | 'editor';
type CatalogSubpage = 'activities' | 'impactTasks' | 'templates';
type AppRole = 'ADMIN' | 'USER';
type UiIconKey = 'home' | 'convocatoria' | 'analisis' | 'catalogos' | 'editor';
type FormFieldType = 'text' | 'textarea' | 'number' | 'date' | 'checkbox' | 'select';
type TemplateField = {
  key: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  options?: string[];
};
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
type CompletedFormItem = {
  activityId: string;
  activityName: string;
  formTemplateId: string;
  formTemplateName: string;
};

const defaultDocumentId = process.env.NEXT_PUBLIC_DEFAULT_DOCUMENT_ID || '';

function UiIcon({ name, className }: { name: UiIconKey; className?: string }) {
  const base = `h-4 w-4 ${className || ''}`;
  switch (name) {
    case 'home':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={base}>
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5.5 9.5V20h13V9.5" />
          <path d="M9.5 20v-6h5v6" />
        </svg>
      );
    case 'convocatoria':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={base}>
          <path d="M7 3h7l5 5v13H7z" />
          <path d="M14 3v6h5" />
          <path d="M10 13h6M10 17h6" />
        </svg>
      );
    case 'analisis':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={base}>
          <path d="M4 12h4l2.5-4 3 8 2.5-5H20" />
        </svg>
      );
    case 'catalogos':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={base}>
          <rect x="4" y="4" width="16" height="6" rx="1.5" />
          <rect x="4" y="14" width="16" height="6" rx="1.5" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={base}>
          <path d="M6 6h12v12H6z" />
          <path d="M9 9h6M9 12h6M9 15h4" />
        </svg>
      );
  }
}

export default function HomePage() {
  const queryClient = useQueryClient();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sessionRole, setSessionRole] = useState<AppRole>('USER');
  const [sessionTenant, setSessionTenant] = useState('demo-tenant');
  const [sessionUserId, setSessionUserId] = useState('usuario');
  const [loginUsername, setLoginUsername] = useState('admin');
  const [loginPassword, setLoginPassword] = useState('');

  const [callId, setCallId] = useState('');
  const [documentId, setDocumentId] = useState(defaultDocumentId);
  const [draft, setDraft] = useState('');
  const [comment, setComment] = useState('');

  const [callTitle, setCallTitle] = useState('Convocatoria de restauracion ambiental');
  const [sourceType, setSourceType] = useState<SourceType>('URL');
  const [sourceValue, setSourceValue] = useState('https://example.org/convocatoria.pdf');
  const [markdownContent, setMarkdownContent] = useState('');
  const [markdownFileName, setMarkdownFileName] = useState('');

  const [activityName, setActivityName] = useState('Recorrido de monitoreo de cuenca');
  const [activityRegion, setActivityRegion] = useState('Region Norte');

  const [impactTitle, setImpactTitle] = useState('Reforestacion de zona critica');
  const [impactDescription, setImpactDescription] = useState('Intervencion con especies nativas y seguimiento bimensual.');

  const [templateName, setTemplateName] = useState('Formato de diagnostico territorial');
  const [templateFields, setTemplateFields] = useState<TemplateField[]>([
    { key: 'localizacion', label: 'Localizacion', type: 'text', required: true },
    { key: 'impacto', label: 'Impacto', type: 'textarea', required: true },
  ]);
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldType, setNewFieldType] = useState<FormFieldType>('text');
  const [newFieldRequired, setNewFieldRequired] = useState(true);
  const [newFieldOptions, setNewFieldOptions] = useState('');
  const [operationMessage, setOperationMessage] = useState('');
  const [assistShareUrl, setAssistShareUrl] = useState('');
  const [assistShareExpiresAt, setAssistShareExpiresAt] = useState('');
  const [assistantRequestedByCall, setAssistantRequestedByCall] = useState<Record<string, boolean>>({});
  const [sidebarNoteOverride, setSidebarNoteOverride] = useState<string | null>(null);
  const [homeCardHintOverride, setHomeCardHintOverride] = useState<string | null>(null);
  const [currentSection, setCurrentSection] = useState<SectionKey>('home');
  const [editModal, setEditModal] = useState<{ type: EditEntityType; item: any } | null>(null);
  const [editName, setEditName] = useState('');
  const [editRegion, setEditRegion] = useState('');
  const [editDocumented, setEditDocumented] = useState(true);
  const [editDescription, setEditDescription] = useState('');
  const [editPriority, setEditPriority] = useState(3);
  const [editTemplateSchemaText, setEditTemplateSchemaText] = useState('');
  const [selectedPendingFormKey, setSelectedPendingFormKey] = useState('');
  const [pendingFormValues, setPendingFormValues] = useState<Record<string, string | number | boolean>>({});
  const [catalogSubpage, setCatalogSubpage] = useState<CatalogSubpage>('activities');
  const [isAutoProcessing, setIsAutoProcessing] = useState(false);
  const [activityTemplateSelection, setActivityTemplateSelection] = useState<Record<string, string>>({});
  const isAdmin = sessionRole === 'ADMIN';
  const [workspaceHydrated, setWorkspaceHydrated] = useState(false);
  const workspaceStorageKey = `app-workspace:${sessionTenant}:${sessionUserId}`;

  useEffect(() => {
    const raw = sessionStorage.getItem('app-session');
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as {
        role?: AppRole;
        tenantId?: string;
        userId?: string;
        token?: string;
      };
      const role: AppRole = parsed.role === 'USER' ? 'USER' : 'ADMIN';
      const tenantId = parsed.tenantId?.trim() || 'demo-tenant';
      const userId = parsed.userId?.trim() || (role === 'ADMIN' ? 'admin' : 'usuario');
      const token = parsed.token?.trim();
      if (!token) throw new Error('Session token missing');
      setSessionRole(role);
      setSessionTenant(tenantId);
      setSessionUserId(userId);
      setSessionContext({ role, tenantId, userId, token });
      setIsAuthenticated(true);
    } catch {
      setIsAuthenticated(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    try {
      const raw = sessionStorage.getItem(workspaceStorageKey);
      if (!raw) {
        setWorkspaceHydrated(true);
        return;
      }
      const parsed = JSON.parse(raw) as Partial<{
        callId: string;
        documentId: string;
        draft: string;
        currentSection: SectionKey;
        callTitle: string;
        sourceType: SourceType;
        sourceValue: string;
        assistantRequestedByCall: Record<string, boolean>;
      }>;
      if (parsed.callId) setCallId(parsed.callId);
      if (parsed.documentId) setDocumentId(parsed.documentId);
      if (parsed.draft) setDraft(parsed.draft);
      if (parsed.currentSection) setCurrentSection(parsed.currentSection);
      if (parsed.callTitle) setCallTitle(parsed.callTitle);
      if (parsed.sourceType) setSourceType(parsed.sourceType);
      if (parsed.sourceValue) setSourceValue(parsed.sourceValue);
      if (parsed.assistantRequestedByCall) setAssistantRequestedByCall(parsed.assistantRequestedByCall);
    } catch {
      // Ignore invalid workspace payload.
    } finally {
      setWorkspaceHydrated(true);
    }
  }, [isAuthenticated, workspaceStorageKey]);

  useEffect(() => {
    if (!isAuthenticated || !workspaceHydrated) return;
    try {
      sessionStorage.setItem(
        workspaceStorageKey,
        JSON.stringify({
          callId,
          documentId,
          draft,
          currentSection,
          callTitle,
          sourceType,
          sourceValue,
          assistantRequestedByCall,
        }),
      );
    } catch {
      // Ignore storage errors.
    }
  }, [
    isAuthenticated,
    workspaceHydrated,
    workspaceStorageKey,
    callId,
    documentId,
    draft,
    currentSection,
    callTitle,
    sourceType,
    sourceValue,
    assistantRequestedByCall,
  ]);

  const activitiesQuery = useQuery({
    queryKey: ['activities'],
    queryFn: api.listActivities,
    enabled: isAuthenticated,
  });

  const impactTasksQuery = useQuery({
    queryKey: ['impactTasks'],
    queryFn: api.listImpactTasks,
    enabled: isAuthenticated,
  });

  const templatesQuery = useQuery({
    queryKey: ['templates'],
    queryFn: api.listFormTemplates,
    enabled: isAuthenticated,
  });

  const callsQuery = useQuery({
    queryKey: ['calls'],
    queryFn: api.listCalls,
    enabled: isAuthenticated,
  });

  const gapsQuery = useQuery({
    queryKey: ['gaps', callId],
    queryFn: () => api.getGaps(callId),
    enabled: isAuthenticated && Boolean(callId),
  });

  const analysisQuery = useQuery({
    queryKey: ['analysis', callId],
    queryFn: () => api.getAnalysis(callId),
    enabled: isAuthenticated && Boolean(callId),
  });

  const documentQuery = useQuery({
    queryKey: ['document', documentId],
    queryFn: () => api.getDocument(documentId),
    enabled: isAuthenticated && Boolean(documentId),
  });
  const pendingFormsQuery = useQuery({
    queryKey: ['pendingForms', callId],
    queryFn: () => api.getPendingForms(callId),
    enabled: isAuthenticated && Boolean(callId),
  });

  const selectedCall = useMemo(
    () => (callsQuery.data || []).find((item) => item.id === callId),
    [callsQuery.data, callId],
  );
  const generatedDraftCalls = useMemo(
    () => (callsQuery.data || []).filter((item) => Boolean(item.documentDraft?.id)),
    [callsQuery.data],
  );
  const pendingForms = (pendingFormsQuery.data?.pendingForms || []) as PendingForm[];
  const completedFormItems = (pendingFormsQuery.data?.completedFormItems || []) as CompletedFormItem[];
  const assistantEligible = !isAdmin && Boolean(callId) && Boolean(gapsQuery.data?.report?.blocked) && pendingForms.length > 0;
  const assistantRequested = Boolean(callId) && Boolean(assistantRequestedByCall[callId]);
  const selectedPendingForm = useMemo(
    () =>
      pendingForms.find(
        (item) => `${item.activityId}:${item.formTemplateId}` === selectedPendingFormKey,
      ) || pendingForms[0],
    [pendingForms, selectedPendingFormKey],
  );

  useEffect(() => {
    if (!pendingForms.length) {
      setSelectedPendingFormKey('');
      return;
    }
    const firstKey = `${pendingForms[0].activityId}:${pendingForms[0].formTemplateId}`;
    setSelectedPendingFormKey((prev) => prev || firstKey);
  }, [pendingForms]);

  useEffect(() => {
    setAssistShareUrl('');
    setAssistShareExpiresAt('');
  }, [callId]);

  const importCallMutation = useMutation({
    mutationFn: () =>
      api.importCall({
        title: callTitle,
        sourceType,
        sourceUrl: sourceType === 'URL' ? sourceValue : undefined,
        sourceStorageKey: sourceType === 'PDF' || sourceType === 'DOCX' ? sourceValue : undefined,
        markdownContent: sourceType === 'MD' ? markdownContent : undefined,
        fileName: sourceType === 'MD' ? markdownFileName : undefined,
      }),
    onSuccess: (data) => {
      setCallId(data.id);
      setDocumentId('');
      queryClient.invalidateQueries({ queryKey: ['calls'] });
      setOperationMessage(`Convocatoria importada: ${data.id}`);
    },
    onError: (error) => setOperationMessage(getErrorMessage(error)),
  });

  const deleteCallMutation = useMutation({
    mutationFn: (id: string) => api.deleteCall(id),
    onSuccess: (result) => {
      if (callId === result.id) {
        setCallId('');
        setDocumentId('');
      }
      queryClient.invalidateQueries({ queryKey: ['calls'] });
      queryClient.invalidateQueries({ queryKey: ['gaps'] });
      queryClient.invalidateQueries({ queryKey: ['analysis'] });
      setOperationMessage(`Convocatoria eliminada: ${result.title}`);
    },
    onError: (error) => setOperationMessage(getErrorMessage(error)),
  });

  const createCollabShareMutation = useMutation({
    mutationFn: () => {
      if (!callId) throw new Error('Selecciona una convocatoria para generar QR.');
      return api.createCallCollabShare(callId);
    },
    onSuccess: (result) => {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const url = `${origin}/asistente?callId=${encodeURIComponent(result.callId)}&token=${encodeURIComponent(result.token)}`;
      setAssistShareUrl(url);
      setAssistShareExpiresAt(result.expiresAt || '');
      setOperationMessage('Enlace de asistencia generado. Comparte el QR con tus asistentes.');
    },
    onError: (error) => setOperationMessage(getErrorMessage(error)),
  });

  const analyzeMutation = useMutation({
    mutationFn: () => {
      if (!callId) throw new Error('Primero debes importar una convocatoria para obtener el callId.');
      return api.analyzePhase1(callId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gaps', callId] });
      queryClient.invalidateQueries({ queryKey: ['calls'] });
      setOperationMessage('FASE_1 analizada correctamente.');
    },
    onError: (error) => setOperationMessage(getErrorMessage(error)),
  });

  const analyzeLlmMutation = useMutation({
    mutationFn: () => {
      if (!callId) throw new Error('Primero debes importar una convocatoria para obtener el callId.');
      return api.analyzePhase1Llm(callId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gaps', callId] });
      queryClient.invalidateQueries({ queryKey: ['analysis', callId] });
      queryClient.invalidateQueries({ queryKey: ['calls'] });
      setOperationMessage('FASE_1 con IA completada y registrada.');
    },
    onError: (error) => setOperationMessage(getErrorMessage(error)),
  });

  const confirmMutation = useMutation({
    mutationFn: () => {
      if (!callId) throw new Error('No hay callId. Importa una convocatoria primero.');
      return api.confirmMinimumPlan(callId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gaps', callId] });
      queryClient.invalidateQueries({ queryKey: ['calls'] });
      setOperationMessage('Minimos confirmados. Puedes generar FASE_2.');
    },
    onError: (error) => setOperationMessage(getErrorMessage(error)),
  });

  const generateMutation = useMutation({
    mutationFn: () => {
      if (!callId) throw new Error('No hay callId. Importa una convocatoria primero.');
      return api.generatePhase2(callId);
    },
    onSuccess: (data) => {
      if (data.documentId) {
        setDocumentId(data.documentId);
        queryClient.invalidateQueries({ queryKey: ['document', data.documentId] });
        setOperationMessage(`FASE_2 generada. Documento: ${data.documentId}`);
      }
      queryClient.invalidateQueries({ queryKey: ['calls'] });
    },
    onError: (error) => setOperationMessage(getErrorMessage(error)),
  });

  const recommendMutation = useMutation({
    mutationFn: () => {
      if (!callId) throw new Error('No hay callId. Importa una convocatoria primero.');
      return api.recommendImpactTasks(callId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analysis', callId] });
      setOperationMessage('Seleccion inteligente de tareas de impacto generada.');
    },
    onError: (error) => setOperationMessage(getErrorMessage(error)),
  });

  const generateDraftLlmMutation = useMutation({
    mutationFn: () => {
      if (!callId) throw new Error('No hay callId. Importa una convocatoria primero.');
      return api.generateDraftLlm(callId);
    },
    onSuccess: (data) => {
      if (data.documentId) setDocumentId(data.documentId);
      queryClient.invalidateQueries({ queryKey: ['document', data.documentId || documentId] });
      queryClient.invalidateQueries({ queryKey: ['calls'] });
      setOperationMessage('Borrador IA generado y cargado en el editor.');
    },
    onError: (error) => setOperationMessage(getErrorMessage(error)),
  });

  const qualityMutation = useMutation({
    mutationFn: () => {
      if (!callId) throw new Error('No hay callId. Importa una convocatoria primero.');
      return api.getDraftQuality(callId);
    },
    onSuccess: (data) => {
      const missing = data?.qualityChecks?.missingData?.length || 0;
      setOperationMessage(`Revision de calidad ejecutada. Pendientes detectados: ${missing}.`);
    },
    onError: (error) => setOperationMessage(getErrorMessage(error)),
  });

  const autoProcessMutation = useMutation({
    mutationFn: () => {
      if (!callId) throw new Error('No hay callId. Importa una convocatoria primero.');
      return api.autoProcess(callId);
    },
    onMutate: () => {
      setIsAutoProcessing(true);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['gaps', callId] });
      queryClient.invalidateQueries({ queryKey: ['analysis', callId] });
      if (data.documentId) {
        setDocumentId(data.documentId);
        queryClient.invalidateQueries({ queryKey: ['document', data.documentId] });
      }
      queryClient.invalidateQueries({ queryKey: ['calls'] });
      setOperationMessage(data.message || 'Proceso automático completado.');
    },
    onError: (error) => setOperationMessage(getErrorMessage(error)),
    onSettled: () => {
      setIsAutoProcessing(false);
    },
  });

  const submitPendingFormMutation = useMutation({
    mutationFn: () => {
      if (!callId) throw new Error('No hay convocatoria seleccionada.');
      if (!selectedPendingForm) throw new Error('No hay formulario pendiente seleccionado.');
      const fields = selectedPendingForm.schemaJson?.fields || [];
      const missing: string[] = [];
      for (const field of fields) {
        if (!field.required || !field.key) continue;
        const value = pendingFormValues[field.key];
        const type = field.type || 'text';
        const label = field.label || field.key;

        const isEmptyString = typeof value === 'string' && value.trim().length === 0;
        const isMissing = value === undefined || value === null || isEmptyString;
        const isInvalidNumber =
          type === 'number' && (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value));
        const isInvalidCheckbox = type === 'checkbox' && value !== true;
        if (isMissing || isInvalidNumber || isInvalidCheckbox) {
          missing.push(label);
        }
      }
      if (missing.length) {
        throw new Error(`Completa los campos obligatorios: ${missing.join(', ')}`);
      }
      return api.submitCallForm(callId, {
        activityId: selectedPendingForm.activityId,
        formTemplateId: selectedPendingForm.formTemplateId,
        response: pendingFormValues,
      });
    },
    onSuccess: () => {
      setPendingFormValues({});
      queryClient.invalidateQueries({ queryKey: ['pendingForms', callId] });
      queryClient.invalidateQueries({ queryKey: ['gaps', callId] });
      setOperationMessage('Formulario completado. Puedes reintentar el analisis automatico.');
    },
    onError: (error) => setOperationMessage(getErrorMessage(error)),
  });

  const createActivityMutation = useMutation({
    mutationFn: () => api.createActivity({ name: activityName, region: activityRegion, documented: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      setOperationMessage('Actividad creada.');
    },
    onError: (error) => setOperationMessage(getErrorMessage(error)),
  });

  const updateActivityMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { name?: string; region?: string; documented?: boolean } }) =>
      api.updateActivity(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      setOperationMessage('Actividad actualizada.');
    },
    onError: (error) => setOperationMessage(getErrorMessage(error)),
  });

  const deleteActivityMutation = useMutation({
    mutationFn: (id: string) => api.deleteActivity(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      setOperationMessage('Actividad eliminada.');
    },
    onError: (error) => setOperationMessage(getErrorMessage(error)),
  });

  const linkActivityTemplateMutation = useMutation({
    mutationFn: ({ activityId, formTemplateId }: { activityId: string; formTemplateId: string }) =>
      api.linkActivityFormTemplate(activityId, { formTemplateId, required: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      setOperationMessage('Formulario vinculado a la actividad.');
    },
    onError: (error) => setOperationMessage(getErrorMessage(error)),
  });

  const unlinkActivityTemplateMutation = useMutation({
    mutationFn: ({ activityId, formTemplateId }: { activityId: string; formTemplateId: string }) =>
      api.unlinkActivityFormTemplate(activityId, formTemplateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      setOperationMessage('Vinculo eliminado.');
    },
    onError: (error) => setOperationMessage(getErrorMessage(error)),
  });

  const createImpactTaskMutation = useMutation({
    mutationFn: () => api.createImpactTask({ title: impactTitle, description: impactDescription, priority: 1 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['impactTasks'] });
      setOperationMessage('Tarea de impacto creada.');
    },
    onError: (error) => setOperationMessage(getErrorMessage(error)),
  });

  const updateImpactTaskMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { title?: string; description?: string; priority?: number } }) =>
      api.updateImpactTask(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['impactTasks'] });
      setOperationMessage('Tarea de impacto actualizada.');
    },
    onError: (error) => setOperationMessage(getErrorMessage(error)),
  });

  const deleteImpactTaskMutation = useMutation({
    mutationFn: (id: string) => api.deleteImpactTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['impactTasks'] });
      setOperationMessage('Tarea de impacto eliminada.');
    },
    onError: (error) => setOperationMessage(getErrorMessage(error)),
  });

  const createTemplateMutation = useMutation({
    mutationFn: () => {
      if (!templateFields.length) throw new Error('Debes agregar al menos un campo al formato.');
      return api.createFormTemplate({
        name: templateName,
        schemaJson: {
          fields: templateFields.map((field) => ({
            key: field.key,
            label: field.label,
            type: field.type,
            required: field.required,
            ...(field.type === 'select' ? { options: field.options || [] } : {}),
          })),
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      setOperationMessage('Formato creado.');
      setTemplateFields([
        { key: 'localizacion', label: 'Localizacion', type: 'text', required: true },
        { key: 'impacto', label: 'Impacto', type: 'textarea', required: true },
      ]);
      setNewFieldLabel('');
      setNewFieldType('text');
      setNewFieldRequired(true);
      setNewFieldOptions('');
    },
    onError: (error) => setOperationMessage(getErrorMessage(error)),
  });

  const updateTemplateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { name?: string; schemaJson?: Record<string, unknown> } }) =>
      api.updateFormTemplate(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      setOperationMessage('Formato actualizado.');
    },
    onError: (error) => setOperationMessage(getErrorMessage(error)),
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id: string) => api.deleteFormTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      setOperationMessage('Formato eliminado.');
    },
    onError: (error) => setOperationMessage(getErrorMessage(error)),
  });

  const editorContent = useMemo(() => {
    if (draft) return draft;
    if (documentQuery.data?.markdownSource) return markdownToHtml(documentQuery.data.markdownSource);
    return '<h1>Anteproyecto</h1><p>Empieza a editar...</p>';
  }, [draft, documentQuery.data?.markdownSource]);
  const userBlockedForEdit = !isAdmin && Boolean(gapsQuery.data?.report?.blocked);
  const canEditDocument = Boolean(documentId) && !userBlockedForEdit;

  const saveMutation = useMutation({
    mutationFn: () => api.updateDocumentContent(documentId, htmlToMarkdown(draft || editorContent)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document', documentId] });
      setOperationMessage('Version guardada correctamente.');
    },
    onError: (error) => setOperationMessage(getErrorMessage(error)),
  });
  const exportMutation = useMutation({
    mutationFn: () => api.exportPdf(documentId),
    onSuccess: (result) => {
      downloadBase64File(result.pdfBase64, result.fileName || 'anteproyecto.pdf', result.mimeType || 'application/pdf');
      setOperationMessage('PDF exportado y descargado.');
    },
    onError: (error) => setOperationMessage(getErrorMessage(error)),
  });
  const commentMutation = useMutation({
    mutationFn: () => api.addComment(documentId, comment),
    onSuccess: () => {
      setOperationMessage('Comentario guardado.');
      setComment('');
      queryClient.invalidateQueries({ queryKey: ['document', documentId] });
    },
    onError: (error) => setOperationMessage(getErrorMessage(error)),
  });
  const lockMutationWrapped = useMutation({
    mutationFn: () => api.lockDocument(documentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document', documentId] });
      setOperationMessage('Bloqueo tomado. Ya puedes editar y guardar.');
    },
    onError: (error) => setOperationMessage(getErrorMessage(error)),
  });
  const unlockMutationWrapped = useMutation({
    mutationFn: () => api.unlockDocument(documentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document', documentId] });
      setOperationMessage('Bloqueo liberado.');
    },
    onError: (error) => setOperationMessage(getErrorMessage(error)),
  });

  async function handleMarkdownFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setMarkdownFileName(file.name);
    const content = await file.text();
    setMarkdownContent(content);
  }

  function openEditActivity(item: { id: string; name: string; region: string; documented: boolean }) {
    setEditModal({ type: 'activity', item });
    setEditName(item.name);
    setEditRegion(item.region);
    setEditDocumented(item.documented);
    setEditDescription('');
    setEditPriority(3);
  }

  function openEditImpactTask(item: { id: string; title: string; description: string; priority: number }) {
    setEditModal({ type: 'impactTask', item });
    setEditName(item.title);
    setEditDescription(item.description);
    setEditPriority(item.priority);
    setEditRegion('');
    setEditDocumented(true);
  }

  function openEditTemplate(item: { id: string; name: string; schemaJson: Record<string, unknown> }) {
    setEditModal({ type: 'formTemplate', item });
    setEditName(item.name);
    setEditTemplateSchemaText(JSON.stringify(item.schemaJson || { fields: [] }, null, 2));
    setEditRegion('');
    setEditDescription('');
    setEditDocumented(true);
    setEditPriority(3);
  }

  function closeEditModal() {
    setEditModal(null);
  }

  function submitEditModal() {
    if (!editModal) return;

    if (editModal.type === 'activity') {
      if (!editName.trim() || !editRegion.trim()) {
        setOperationMessage('Nombre y region son obligatorios para actividad.');
        return;
      }
      updateActivityMutation.mutate({
        id: editModal.item.id,
        payload: {
          name: editName.trim(),
          region: editRegion.trim(),
          documented: editDocumented,
        },
      });
      closeEditModal();
      return;
    }

    if (editModal.type === 'impactTask') {
      if (!editName.trim() || !editDescription.trim()) {
        setOperationMessage('Titulo y descripcion son obligatorios para tarea de impacto.');
        return;
      }
      updateImpactTaskMutation.mutate({
        id: editModal.item.id,
        payload: {
          title: editName.trim(),
          description: editDescription.trim(),
          priority: Math.max(1, Math.min(5, Math.round(editPriority || 3))),
        },
      });
      closeEditModal();
      return;
    }

    if (!editName.trim()) {
      setOperationMessage('El nombre del formato es obligatorio.');
      return;
    }

    let parsedSchema: Record<string, unknown>;
    try {
      parsedSchema = JSON.parse(editTemplateSchemaText) as Record<string, unknown>;
    } catch {
      setOperationMessage('El schema del formato no es JSON valido.');
      return;
    }

    updateTemplateMutation.mutate({
      id: editModal.item.id,
      payload: { name: editName.trim(), schemaJson: parsedSchema },
    });
    closeEditModal();
  }

  function normalizeFieldKey(input: string) {
    return input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s_]/g, '')
      .replace(/\s+/g, '_')
      .slice(0, 40);
  }

  function addTemplateField() {
    const label = newFieldLabel.trim();
    if (!label) {
      setOperationMessage('El nombre del campo es obligatorio.');
      return;
    }
    const key = normalizeFieldKey(label);
    if (!key) {
      setOperationMessage('No se pudo generar clave para el campo.');
      return;
    }
    if (templateFields.some((field) => field.key === key)) {
      setOperationMessage(`Ya existe un campo con key "${key}".`);
      return;
    }
    const options =
      newFieldType === 'select'
        ? newFieldOptions
            .split(',')
            .map((x) => x.trim())
            .filter(Boolean)
        : undefined;
    if (newFieldType === 'select' && (!options || options.length === 0)) {
      setOperationMessage('Un campo select requiere opciones separadas por coma.');
      return;
    }
    setTemplateFields((prev) => [
      ...prev,
      {
        key,
        label,
        type: newFieldType,
        required: newFieldRequired,
        options,
      },
    ]);
    setNewFieldLabel('');
    setNewFieldType('text');
    setNewFieldRequired(true);
    setNewFieldOptions('');
  }

  function updatePendingFieldValue(key: string, value: string | number | boolean) {
    setPendingFormValues((prev) => ({ ...prev, [key]: value }));
  }

  async function startSession() {
    try {
      const tenantId = sessionTenant.trim() || 'demo-tenant';
      const username = loginUsername.trim();
      if (!username || !loginPassword.trim()) {
        setOperationMessage('Ingresa usuario y contraseña.');
        return;
      }
      const result = await api.login({ username, password: loginPassword, tenantId });
      const role: AppRole = result.role === 'ADMIN' ? 'ADMIN' : 'USER';
      const userId = result.userId || username;
      const token = result.token as string;

      setSessionContext({ role, tenantId, userId, token });
      sessionStorage.setItem('app-session', JSON.stringify({ role, tenantId, userId, token }));
      setSessionRole(role);
      setSessionTenant(tenantId);
      setSessionUserId(userId);
      setWorkspaceHydrated(false);
      setIsAuthenticated(true);
      setLoginPassword('');
      setOperationMessage('');
      queryClient.invalidateQueries();
    } catch (error) {
      setOperationMessage(getErrorMessage(error));
    }
  }

  function logout() {
    clearSessionContext();
    sessionStorage.removeItem(workspaceStorageKey);
    sessionStorage.removeItem('app-session');
    setIsAuthenticated(false);
    setWorkspaceHydrated(false);
    setCallId('');
    setDocumentId('');
    setDraft('');
  }

  if (!isAuthenticated) {
    return (
      <main className="abt-theme flex min-h-screen items-center justify-center bg-slate-200 p-6">
        <section className="w-full max-w-[440px] rounded-xl border border-slate-300 bg-white p-8 shadow-sm">
          <h1 className="text-center text-4xl font-semibold tracking-tight text-slate-900">ABT</h1>
          <p className="mt-2 text-center text-base text-slate-500">Iniciar sesión en la plataforma ambiental.</p>
          <form
            className="mt-8"
            onSubmit={(e) => {
              e.preventDefault();
              startSession();
            }}
          >
            <label className="block text-lg font-medium text-slate-800">Email</label>
            <input
              className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-3 text-base text-slate-800"
              value={loginUsername}
              onChange={(e) => setLoginUsername(e.target.value)}
              placeholder="m@example.com"
            />
            <label className="mt-5 block text-lg font-medium text-slate-800">Contraseña</label>
            <input
              type="password"
              className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-3 text-base text-slate-800"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
            />
            <button
              type="submit"
              className="mt-7 w-full rounded-md bg-slate-950 px-3 py-3 text-lg font-semibold text-white"
            >
              Iniciar sesión
            </button>
            <p className="mt-4 text-center text-xs text-slate-500">
              Demo: <strong>admin/admin123</strong> o <strong>usuario/user123</strong>
            </p>
            <p className="mt-1 text-center text-[11px] text-slate-400">Tenant activo: {sessionTenant}</p>
            <p className="mt-1 text-center text-[11px] text-emerald-700">Promotor: AWAQ ORNG</p>
          </form>
        </section>
      </main>
    );
  }

  const sidebarSections = [
    { key: 'home', title: 'Inicio', note: 'Resumen y accesos rapidos', icon: 'home' as UiIconKey },
    {
      key: 'convocatoria',
      title: 'Convocatorias',
      note: 'Carga y registro de fuente',
      icon: 'convocatoria' as UiIconKey,
    },
    {
      key: 'analisis',
      title: 'Diagnosticos',
      note: 'FASE_1, brechas y draft IA',
      icon: 'analisis' as UiIconKey,
    },
    {
      key: 'catalogos',
      title: 'Base',
      note: 'Actividades, tareas y formatos',
      icon: 'catalogos' as UiIconKey,
    },
    {
      key: 'editor',
      title: 'Anteproyectos',
      note: 'Revision final y PDF',
      icon: 'editor' as UiIconKey,
    },
  ].filter((section) => (isAdmin ? true : section.key !== 'catalogos'));
  const activeSidebarNote =
    sidebarNoteOverride || sidebarSections.find((section) => section.key === currentSection)?.note || 'Navegacion principal';

  return (
    <main className="abt-theme flex h-screen bg-white">
      <aside className="h-screen w-64 border-r border-slate-200 bg-slate-50 p-4">
        <h2 className="text-base font-semibold text-slate-700">ABT</h2>
        <p className="mt-1 min-h-8 text-xs text-slate-500">{activeSidebarNote}</p>
        <div className="mt-4 space-y-2">
            {sidebarSections.map((section) => (
              <button
                key={section.key}
                className={`w-full rounded-md border px-3 py-2 text-left transition-colors ${
                  currentSection === section.key
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                }`}
                onClick={() => setCurrentSection(section.key as SectionKey)}
                onMouseEnter={() => setSidebarNoteOverride(section.note)}
                onMouseLeave={() => setSidebarNoteOverride(null)}
                onFocus={() => setSidebarNoteOverride(section.note)}
                onBlur={() => setSidebarNoteOverride(null)}
              >
                <div className="flex items-start gap-2">
                  <span className={`mt-0.5 ${currentSection === section.key ? 'text-slate-100' : 'text-slate-500'}`}>
                    <UiIcon name={section.icon} />
                  </span>
                  <span>
                    <p className="text-sm font-semibold">{section.title}</p>
                  </span>
                </div>
              </button>
            ))}
        </div>
      </aside>

      <section className="flex-1 overflow-hidden">
        <header className="h-14 border-b border-slate-200 bg-white px-6">
          <div className="flex h-full items-center justify-between">
            <p className="text-sm font-semibold text-slate-500">ABT · Plataforma de Convocatorias Ambientales</p>
            <div className="flex items-center gap-2">
              <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs text-emerald-700">
                AWAQ ORNG
              </span>
              <span className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600">
                {sessionRole} · {sessionUserId}
              </span>
              <button className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600" onClick={logout}>
                Cerrar sesión
              </button>
            </div>
          </div>
        </header>
        <div className="h-[calc(100vh-56px)] overflow-auto bg-slate-50 p-6">
          <header className="mb-4 rounded-lg border border-slate-200 bg-white p-6">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">ABT</h1>
            <p className="mt-1 text-sm text-slate-600">Plataforma de Convocatorias Ambientales</p>
          </header>

          <div className="mb-4 rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-700">
            {operationMessage || 'Listo para operar.'}
          </div>

          {currentSection === 'home' ? (
            <div className="mb-6">
              {(() => {
                const cards = [
                {
                  key: 'convocatoria',
                  icon: 'convocatoria' as UiIconKey,
                  section: 'Convocatorias',
                  title: 'Documentos',
                  desc: 'Carga URL/PDF/DOCX/MD y registra la convocatoria.',
                },
                {
                  key: 'analisis',
                  icon: 'analisis' as UiIconKey,
                  section: 'Diagnosticos',
                  title: 'Territorios',
                  desc: 'Ejecuta FASE_1, valida brechas y genera propuesta.',
                },
                {
                  key: 'editor',
                  icon: 'editor' as UiIconKey,
                  section: 'Anteproyectos',
                  title: 'Generacion',
                  desc: 'Edicion tipo Word, comentarios y exportacion PDF.',
                },
                {
                  key: 'catalogos',
                  icon: 'catalogos' as UiIconKey,
                  section: 'Base',
                  title: 'Conocimiento',
                  desc: 'Actividades, tareas de impacto y formatos.',
                },
                ].filter((card) => (isAdmin ? true : card.key !== 'catalogos'));
                const activeHomeHint = homeCardHintOverride || cards[0]?.desc || '';
                return (
                  <>
                    <p className="mb-3 text-sm text-slate-600">{activeHomeHint}</p>
                    <div className="grid gap-4 lg:grid-cols-3">
                      {cards.map((card) => (
                        <button
                          key={card.key}
                          onClick={() => setCurrentSection(card.key as SectionKey)}
                          onMouseEnter={() => setHomeCardHintOverride(card.desc)}
                          onMouseLeave={() => setHomeCardHintOverride(null)}
                          onFocus={() => setHomeCardHintOverride(card.desc)}
                          onBlur={() => setHomeCardHintOverride(null)}
                          className="rounded-xl border border-slate-200 bg-white p-6 text-left shadow-sm transition-colors hover:bg-slate-100"
                        >
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-slate-800">{card.section}</p>
                            <span className="text-slate-400">
                              <UiIcon name={card.icon} />
                            </span>
                          </div>
                          <p className="mt-2 text-4xl font-bold tracking-tight text-slate-900">{card.title}</p>
                        </button>
                      ))}
                    </div>
                  </>
                );
              })()}
            </div>
          ) : null}

      {(currentSection === 'convocatoria' || currentSection === 'analisis') ? (
      <div className="mb-6 grid gap-4 rounded-lg border border-slate-200 bg-white p-4 lg:grid-cols-2">
        <div className={currentSection === 'analisis' ? 'hidden' : ''}>
          <h2 className="font-heading text-lg font-semibold">1) Ingesta Convocatoria</h2>
          <input
            className="mt-2 w-full rounded-md border border-slate-300 p-2 text-sm"
            value={callTitle}
            onChange={(e) => setCallTitle(e.target.value)}
            placeholder="Titulo convocatoria"
          />
          <div className="mt-2 flex gap-2">
            <select
              className="rounded-md border border-slate-300 p-2 text-sm"
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value as SourceType)}
            >
              <option value="URL">URL</option>
              <option value="PDF">PDF</option>
              <option value="DOCX">DOCX</option>
              <option value="MD">Archivo MD</option>
            </select>
            {sourceType === 'MD' ? (
              <input
                className="flex-1 rounded-md border border-slate-300 p-2 text-sm"
                type="file"
                accept=".md,text/markdown"
                onChange={handleMarkdownFileChange}
              />
            ) : (
              <input
                className="flex-1 rounded-md border border-slate-300 p-2 text-sm"
                value={sourceValue}
                onChange={(e) => setSourceValue(e.target.value)}
                placeholder={sourceType === 'URL' ? 'https://...' : 's3://bucket/file'}
              />
            )}
          </div>
          {sourceType === 'MD' ? (
            <p className="mt-2 text-xs text-slate-600">
              Archivo: {markdownFileName || '-'} | Caracteres: {markdownContent.length}
            </p>
          ) : null}
          <button
            className="mt-2 rounded-md bg-slate-900 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:bg-slate-400"
            onClick={() => importCallMutation.mutate()}
            disabled={sourceType === 'MD' && !markdownContent}
          >
            Importar convocatoria
          </button>
          {sourceType === 'MD' && !markdownContent ? (
            <p className="mt-1 text-xs text-rose-700">Carga un archivo `.md` antes de importar.</p>
          ) : null}
          <p className="mt-2 text-xs text-slate-600">Call ID actual: {callId || '-'}</p>
          {isAdmin ? (
            <div className="mt-4 rounded border border-slate-200 bg-slate-50 p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-700">Convocatorias registradas</p>
                <span className="text-[11px] text-slate-500">
                  {(callsQuery.data || []).length} total
                </span>
              </div>
              <div className="max-h-48 overflow-auto rounded border border-slate-200 bg-white">
                {(callsQuery.data || []).length ? (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700">
                      <tr>
                        <th className="px-2 py-1 font-semibold">Titulo</th>
                        <th className="px-2 py-1 font-semibold">Estado</th>
                        <th className="px-2 py-1 font-semibold">Anteproyecto</th>
                        <th className="px-2 py-1 font-semibold">Accion</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(callsQuery.data || []).map((item) => {
                        const hasDraft = Boolean(item.documentDraft?.id);
                        return (
                          <tr key={item.id} className="border-t border-slate-100">
                            <td className="px-2 py-1 text-slate-700">{item.title}</td>
                            <td className="px-2 py-1 text-slate-600">{item.status}</td>
                            <td className="px-2 py-1 text-slate-600">{hasDraft ? 'Si' : 'No'}</td>
                            <td className="px-2 py-1">
                              <button
                                type="button"
                                className="rounded bg-rose-600 px-2 py-1 text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                                disabled={hasDraft || deleteCallMutation.isPending}
                                onClick={() => {
                                  const ok = window.confirm(
                                    `Eliminar convocatoria "${item.title}"? Esta accion no se puede deshacer.`,
                                  );
                                  if (!ok) return;
                                  deleteCallMutation.mutate(item.id);
                                }}
                              >
                                Eliminar
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <p className="p-2 text-xs text-slate-500">No hay convocatorias registradas.</p>
                )}
              </div>
              <p className="mt-2 text-[11px] text-slate-500">
                Solo se pueden eliminar convocatorias sin anteproyecto asociado.
              </p>
            </div>
          ) : null}
        </div>

        <div className={currentSection === 'convocatoria' ? 'hidden' : ''}>
          <h2 className="font-heading text-lg font-semibold">2) FASE_1 y FASE_2</h2>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <select
              className="min-w-[260px] rounded-md border border-slate-300 p-2 text-sm"
              value={callId}
              onChange={(e) => {
                const nextCallId = e.target.value;
                setCallId(nextCallId);
                const matched = (callsQuery.data || []).find((item) => item.id === nextCallId);
                setDocumentId(matched?.documentDraft?.id || '');
              }}
            >
              <option value="">Selecciona una convocatoria</option>
              {(callsQuery.data || []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title} - {item.status}
                </option>
              ))}
            </select>
            <button
              className="rounded-md border border-slate-300 px-3 py-2 text-xs text-slate-700"
              onClick={() => callsQuery.refetch()}
              type="button"
            >
              Actualizar lista
            </button>
          </div>
          {selectedCall ? (
            <p className="mt-1 text-xs text-slate-600">
              Trabajando en: <strong>{selectedCall.title}</strong> ({selectedCall.id})
            </p>
          ) : null}
          {assistantEligible ? (
            <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
              {!assistantRequested ? (
                <>
                  <p className="text-xs font-semibold text-slate-700">Asistencia opcional</p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Puedes solicitar apoyo para que otras personas completen formularios pendientes.
                  </p>
                  <button
                    type="button"
                    className="mt-2 rounded-md bg-slate-900 px-2 py-1 text-xs text-white"
                    onClick={() => {
                      if (!callId) return;
                      setAssistantRequestedByCall((prev) => ({ ...prev, [callId]: true }));
                      setOperationMessage('Asistencia activada para esta convocatoria.');
                    }}
                  >
                    Solicitar asistencia
                  </button>
                </>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-semibold text-slate-700">Asistencia por QR</p>
                    <button
                      type="button"
                      className="rounded-md bg-slate-900 px-2 py-1 text-xs text-white disabled:cursor-not-allowed disabled:bg-slate-400"
                      onClick={() => createCollabShareMutation.mutate()}
                      disabled={!callId || createCollabShareMutation.isPending}
                    >
                      {createCollabShareMutation.isPending ? 'Generando...' : 'Generar QR para asistentes'}
                    </button>
                    <button
                      type="button"
                      className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700"
                      onClick={() => {
                        if (!callId) return;
                        setAssistantRequestedByCall((prev) => ({ ...prev, [callId]: false }));
                        setAssistShareUrl('');
                        setAssistShareExpiresAt('');
                        setOperationMessage('Asistencia desactivada para esta convocatoria.');
                      }}
                    >
                      Desactivar asistencia
                    </button>
                  </div>
                  {assistShareUrl ? (
                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(assistShareUrl)}`}
                    alt="QR de asistencia"
                    className="h-[180px] w-[180px] rounded border border-slate-200 bg-white p-1"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-slate-500">Escanea o comparte este enlace:</p>
                    <p className="mt-1 break-all rounded border border-slate-200 bg-white p-2 text-[11px] text-slate-700">
                      {assistShareUrl}
                    </p>
                    <button
                      type="button"
                      className="mt-2 rounded border border-slate-300 px-2 py-1 text-xs text-slate-700"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(assistShareUrl);
                          setOperationMessage('Enlace copiado al portapapeles.');
                        } catch {
                          setOperationMessage('No se pudo copiar. Puedes copiarlo manualmente.');
                        }
                      }}
                    >
                      Copiar enlace
                    </button>
                    {assistShareExpiresAt ? (
                      <p className="mt-1 text-[11px] text-slate-500">
                        Expira: {new Date(assistShareExpiresAt).toLocaleString()}
                      </p>
                    ) : null}
                  </div>
                </div>
                  ) : (
                    <p className="mt-1 text-[11px] text-slate-500">
                      Genera un QR para que otras personas completen formularios pendientes de esta convocatoria.
                    </p>
                  )}
                </>
              )}
            </div>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-2">
            {isAdmin ? (
              <>
                <button
                  className="rounded-md bg-slate-700 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:bg-slate-400"
                  onClick={() => analyzeMutation.mutate()}
                  disabled={!callId}
                >
                  Analizar FASE_1
                </button>
                <button
                  className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:bg-slate-400"
                  onClick={() => analyzeLlmMutation.mutate()}
                  disabled={!callId}
                >
                  Analizar FASE_1 con IA
                </button>
                <button
                  className="rounded-md bg-slate-700 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:bg-slate-400"
                  onClick={() => confirmMutation.mutate()}
                  disabled={!callId}
                >
                  Confirmar minimos
                </button>
                <button
                  className="rounded-md bg-slate-800 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:bg-slate-400"
                  onClick={() => recommendMutation.mutate()}
                  disabled={!callId}
                >
                  Recomendar tareas IA
                </button>
                <button
                  className="rounded-md bg-slate-800 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:bg-slate-400"
                  onClick={() => generateMutation.mutate()}
                  disabled={!callId}
                >
                  Generar FASE_2
                </button>
                <button
                  className="rounded-md bg-black px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:bg-slate-400"
                  onClick={() => generateDraftLlmMutation.mutate()}
                  disabled={!callId}
                >
                  Generar borrador IA
                </button>
                <button
                  className="rounded-md bg-black px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:bg-slate-400"
                  onClick={() => qualityMutation.mutate()}
                  disabled={!callId}
                >
                  Revisar calidad draft
                </button>
              </>
            ) : (
              <div className="flex flex-wrap gap-2">
                <button
                  className="inline-flex items-center gap-2 rounded-md bg-black px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:bg-slate-400"
                  onClick={() => autoProcessMutation.mutate()}
                  disabled={!callId || isAutoProcessing}
                >
                  {isAutoProcessing ? (
                    <>
                      <span className="h-2 w-2 animate-ping rounded-full bg-white" />
                      Procesando analisis...
                    </>
                  ) : (
                    'Activar analisis automatico'
                  )}
                </button>
                <button
                  className="rounded-md bg-slate-800 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:bg-slate-400"
                  onClick={() => generateMutation.mutate()}
                  disabled={!callId || Boolean(gapsQuery.data?.report?.blocked) || isAutoProcessing}
                >
                  Pasar a FASE_2
                </button>
              </div>
            )}
          </div>
          {!isAdmin ? (
            <p className="mt-2 text-xs text-slate-600">
              Primero ejecuta el analisis automatico. Si cumple minimos, habilita el boton para pasar a FASE_2.
            </p>
          ) : null}
          {!isAdmin && isAutoProcessing ? (
            <p className="mt-2 text-xs font-semibold text-slate-700 animate-pulse">
              Analizando convocatoria y validando minimos... esto puede tardar unos segundos.
            </p>
          ) : null}
          {isAdmin ? (
            <>
              <pre className="mt-2 max-h-44 overflow-auto rounded bg-slate-50 p-2 text-xs text-slate-700">
                {JSON.stringify(analysisQuery.data?.requirements || { info: 'Sin analisis aun' }, null, 2)}
              </pre>
              <pre className="mt-2 overflow-auto rounded bg-slate-50 p-2 text-xs text-slate-700">
                {JSON.stringify(gapsQuery.data?.report || { gaps: [], blocked: false }, null, 2)}
              </pre>
            </>
          ) : (
            <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
              {!callId ? (
                <p className="text-slate-600">Selecciona una convocatoria para ver el estado del proceso.</p>
              ) : !gapsQuery.data?.report ? (
                <p className="text-slate-600">Aun no hay resultados de analisis para esta convocatoria.</p>
              ) : gapsQuery.data.report.blocked ? (
                <>
                  <p className="font-semibold text-rose-700">Fase 2 bloqueada: faltan requisitos por cumplir.</p>
                  <ul className="mt-2 list-disc pl-5 text-slate-700">
                    {(gapsQuery.data.report.gaps || []).map((gap: any, idx: number) => (
                      <li key={`${gap.code || 'gap'}-${idx}`}>
                        {gap.description} ({gap.currentCount}/{gap.requiredCount})
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 rounded border border-slate-200 bg-white p-3">
                    <p className="text-xs font-semibold text-slate-700">Checklist de formularios</p>
                    <div className="mt-2 space-y-1">
                      {completedFormItems.length ? (
                        completedFormItems.map((item) => (
                          <p
                            key={`done-${item.activityId}-${item.formTemplateId}`}
                            className="text-xs text-emerald-700"
                          >
                            [x] {item.activityName} {' -> '} {item.formTemplateName}
                          </p>
                        ))
                      ) : (
                        <p className="text-xs text-slate-500">Aun no hay formularios completados.</p>
                      )}
                      {(pendingForms || []).map((item) => (
                        <p
                          key={`todo-${item.activityId}-${item.formTemplateId}`}
                          className="text-xs text-slate-600"
                        >
                          [ ] {item.activityName} {' -> '} {item.formTemplateName}
                        </p>
                      ))}
                    </div>
                  </div>
                  {(pendingForms || []).length ? (
                    <div className="mt-3 rounded border border-slate-200 bg-white p-3">
                      <p className="text-xs font-semibold text-slate-700">
                        Formularios pendientes para desbloquear fase 2
                      </p>
                      <select
                        className="mt-2 w-full rounded border border-slate-300 p-2 text-xs"
                        value={selectedPendingFormKey}
                        onChange={(e) => {
                          setSelectedPendingFormKey(e.target.value);
                          setPendingFormValues({});
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
                      {selectedPendingForm?.schemaJson?.fields?.length ? (
                        <div className="mt-2 space-y-2">
                          {selectedPendingForm.schemaJson.fields.map((field) => {
                            const fieldType = field.type || 'text';
                            const label = field.label || field.key;
                            const value = pendingFormValues[field.key];
                            return (
                              <div key={field.key}>
                                <label className="mb-1 block text-[11px] font-semibold text-slate-600">
                                  {label} {field.required ? '*' : ''}
                                </label>
                                {fieldType === 'textarea' ? (
                                  <textarea
                                    className="w-full rounded border border-slate-300 p-2 text-xs"
                                    value={String(value || '')}
                                    onChange={(e) => updatePendingFieldValue(field.key, e.target.value)}
                                  />
                                ) : fieldType === 'number' ? (
                                  <input
                                    type="number"
                                    className="w-full rounded border border-slate-300 p-2 text-xs"
                                    value={value === undefined ? '' : String(value)}
                                    onChange={(e) => updatePendingFieldValue(field.key, Number(e.target.value))}
                                  />
                                ) : fieldType === 'date' ? (
                                  <input
                                    type="date"
                                    className="w-full rounded border border-slate-300 p-2 text-xs"
                                    value={String(value || '')}
                                    onChange={(e) => updatePendingFieldValue(field.key, e.target.value)}
                                  />
                                ) : fieldType === 'checkbox' ? (
                                  <label className="flex items-center gap-2 text-xs text-slate-700">
                                    <input
                                      type="checkbox"
                                      checked={Boolean(value)}
                                      onChange={(e) => updatePendingFieldValue(field.key, e.target.checked)}
                                    />
                                    Marcar
                                  </label>
                                ) : fieldType === 'select' ? (
                                  <select
                                    className="w-full rounded border border-slate-300 p-2 text-xs"
                                    value={String(value || '')}
                                    onChange={(e) => updatePendingFieldValue(field.key, e.target.value)}
                                  >
                                    <option value="">Selecciona una opcion</option>
                                    {(field.options || []).map((opt) => (
                                      <option key={opt} value={opt}>
                                        {opt}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <input
                                    type="text"
                                    className="w-full rounded border border-slate-300 p-2 text-xs"
                                    value={String(value || '')}
                                    onChange={(e) => updatePendingFieldValue(field.key, e.target.value)}
                                  />
                                )}
                              </div>
                            );
                          })}
                          <button
                            className="rounded bg-slate-900 px-3 py-2 text-xs text-white"
                            onClick={() => submitPendingFormMutation.mutate()}
                          >
                            Guardar formulario
                          </button>
                        </div>
                      ) : (
                        <p className="mt-2 text-xs text-slate-600">
                          Este formulario no tiene estructura definida. Solicita al administrador configurar campos.
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-slate-600">
                      No hay formularios pendientes detectados para esta convocatoria.
                    </p>
                  )}
                </>
              ) : (
                <p className="font-semibold text-emerald-700">Listo: cumples los minimos y puedes pasar a fase 2.</p>
              )}
            </div>
          )}
          <p className="text-xs text-slate-600">Document ID actual: {documentId || '-'}</p>
        </div>
      </div>
      ) : null}

      {currentSection === 'catalogos' ? (isAdmin ? (
      <div className="mb-6 rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-4 flex flex-wrap gap-2">
          {[
            { key: 'activities', label: 'Actividades' },
            { key: 'impactTasks', label: 'Tareas de impacto' },
            { key: 'templates', label: 'Formatos formulario' },
          ].map((tab) => (
            <button
              key={tab.key}
              className={`rounded-md border px-3 py-2 text-sm ${
                catalogSubpage === tab.key
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-300 bg-white text-slate-700'
              }`}
              onClick={() => setCatalogSubpage(tab.key as CatalogSubpage)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {catalogSubpage === 'activities' ? (
          <div>
            <h3 className="font-heading text-base font-semibold">Actividades</h3>
            <input className="mt-2 w-full rounded-md border border-slate-300 p-2 text-sm" value={activityName} onChange={(e) => setActivityName(e.target.value)} />
            <input className="mt-2 w-full rounded-md border border-slate-300 p-2 text-sm" value={activityRegion} onChange={(e) => setActivityRegion(e.target.value)} />
            <button className="mt-2 rounded-md bg-slate-900 px-3 py-2 text-sm text-white" onClick={() => createActivityMutation.mutate()}>
              Crear actividad documentada
            </button>
            <p className="mt-2 text-xs">Total: {activitiesQuery.data?.length ?? 0}</p>
            <div className="mt-2 max-h-[55vh] space-y-2 overflow-auto">
              {(activitiesQuery.data || []).map((item) => (
                <div key={item.id} className="rounded border border-slate-200 p-2 text-xs">
                  <p className="font-semibold">{item.name}</p>
                  <p className="text-slate-600">{item.region}</p>
                  <p className="text-slate-600">{item.documented ? 'Documentada' : 'No documentada'}</p>
                  <div className="mt-2 rounded border border-slate-100 bg-slate-50 p-2">
                    <p className="font-semibold text-slate-700">Formularios vinculados</p>
                    {(item.formLinks || []).length ? (
                      <div className="mt-1 space-y-1">
                        {(item.formLinks || []).map((link: any) => (
                          <div key={link.formTemplate.id} className="flex items-center justify-between gap-2">
                            <p className="text-slate-600">
                              {link.formTemplate.name} {link.formTemplate.isActive ? '' : '(inactivo)'}
                            </p>
                            <button
                              className="rounded bg-rose-600 px-2 py-1 text-[11px] text-white"
                              onClick={() =>
                                unlinkActivityTemplateMutation.mutate({
                                  activityId: item.id,
                                  formTemplateId: link.formTemplate.id,
                                })
                              }
                            >
                              Quitar
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-1 text-slate-500">Sin formularios vinculados.</p>
                    )}
                    <div className="mt-2 flex gap-1">
                      <select
                        className="flex-1 rounded border border-slate-300 p-1 text-[11px]"
                        value={activityTemplateSelection[item.id] || ''}
                        onChange={(e) =>
                          setActivityTemplateSelection((prev) => ({
                            ...prev,
                            [item.id]: e.target.value,
                          }))
                        }
                      >
                        <option value="">Seleccionar formulario</option>
                        {(templatesQuery.data || []).map((template) => (
                          <option key={template.id} value={template.id}>
                            {template.name}
                          </option>
                        ))}
                      </select>
                      <button
                        className="rounded bg-slate-700 px-2 py-1 text-[11px] text-white disabled:bg-slate-400"
                        disabled={!activityTemplateSelection[item.id]}
                        onClick={() =>
                          linkActivityTemplateMutation.mutate({
                            activityId: item.id,
                            formTemplateId: activityTemplateSelection[item.id],
                          })
                        }
                      >
                        Vincular
                      </button>
                    </div>
                  </div>
                  <div className="mt-1 flex gap-2">
                    <button className="rounded bg-slate-200 px-2 py-1" onClick={() => openEditActivity(item)}>
                      Editar
                    </button>
                    <button className="rounded bg-rose-600 px-2 py-1 text-white" onClick={() => deleteActivityMutation.mutate(item.id)}>
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {catalogSubpage === 'impactTasks' ? (
          <div>
            <h3 className="font-heading text-base font-semibold">Tareas de impacto</h3>
            <input className="mt-2 w-full rounded-md border border-slate-300 p-2 text-sm" value={impactTitle} onChange={(e) => setImpactTitle(e.target.value)} />
            <textarea className="mt-2 w-full rounded-md border border-slate-300 p-2 text-sm" value={impactDescription} onChange={(e) => setImpactDescription(e.target.value)} />
            <button className="mt-2 rounded-md bg-slate-900 px-3 py-2 text-sm text-white" onClick={() => createImpactTaskMutation.mutate()}>
              Crear tarea de impacto
            </button>
            <p className="mt-2 text-xs">Total: {impactTasksQuery.data?.length ?? 0}</p>
            <div className="mt-2 max-h-[55vh] space-y-2 overflow-auto">
              {(impactTasksQuery.data || []).map((item) => (
                <div key={item.id} className="rounded border border-slate-200 p-2 text-xs">
                  <p className="font-semibold">{item.title}</p>
                  <p className="text-slate-600">{item.description}</p>
                  <p className="text-slate-600">Prioridad: {item.priority}</p>
                  <div className="mt-1 flex gap-2">
                    <button className="rounded bg-slate-200 px-2 py-1" onClick={() => openEditImpactTask(item)}>
                      Editar
                    </button>
                    <button className="rounded bg-rose-600 px-2 py-1 text-white" onClick={() => deleteImpactTaskMutation.mutate(item.id)}>
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {catalogSubpage === 'templates' ? (
          <div>
            <h3 className="font-heading text-base font-semibold">Formatos formulario</h3>
            <input className="mt-2 w-full rounded-md border border-slate-300 p-2 text-sm" value={templateName} onChange={(e) => setTemplateName(e.target.value)} />
            <div className="mt-2 rounded border border-slate-200 bg-slate-50 p-2">
              <p className="text-xs font-semibold text-slate-700">Campos del formulario</p>
              <div className="mt-2 grid grid-cols-1 gap-2">
                <input
                  className="rounded border border-slate-300 p-2 text-xs"
                  placeholder="Nombre del campo (ej. Calidad del agua)"
                  value={newFieldLabel}
                  onChange={(e) => setNewFieldLabel(e.target.value)}
                />
                <div className="flex gap-2">
                  <select
                    className="flex-1 rounded border border-slate-300 p-2 text-xs"
                    value={newFieldType}
                    onChange={(e) => setNewFieldType(e.target.value as FormFieldType)}
                  >
                    <option value="text">Texto</option>
                    <option value="textarea">Texto largo</option>
                    <option value="number">Numero</option>
                    <option value="date">Fecha</option>
                    <option value="checkbox">Checkbox</option>
                    <option value="select">Selector</option>
                  </select>
                  <label className="flex items-center gap-1 rounded border border-slate-300 px-2 text-xs">
                    <input
                      type="checkbox"
                      checked={newFieldRequired}
                      onChange={(e) => setNewFieldRequired(e.target.checked)}
                    />
                    Requerido
                  </label>
                </div>
                {newFieldType === 'select' ? (
                  <input
                    className="rounded border border-slate-300 p-2 text-xs"
                    placeholder="Opciones separadas por coma"
                    value={newFieldOptions}
                    onChange={(e) => setNewFieldOptions(e.target.value)}
                  />
                ) : null}
                <button className="rounded bg-slate-700 px-2 py-1 text-xs text-white" onClick={addTemplateField}>
                  Agregar campo
                </button>
              </div>
              <div className="mt-2 space-y-1">
                {templateFields.map((field, idx) => (
                  <div key={field.key} className="flex items-center justify-between rounded border border-slate-200 bg-white px-2 py-1">
                    <p className="text-[11px] text-slate-700">
                      {idx + 1}. {field.label} [{field.type}] {field.required ? '(requerido)' : ''}
                    </p>
                    <button
                      className="rounded bg-rose-600 px-2 py-1 text-[11px] text-white"
                      onClick={() => setTemplateFields((prev) => prev.filter((x) => x.key !== field.key))}
                    >
                      Quitar
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <button className="mt-2 rounded-md bg-slate-900 px-3 py-2 text-sm text-white" onClick={() => createTemplateMutation.mutate()}>
              Crear formato
            </button>
            <p className="mt-2 text-xs">Total: {templatesQuery.data?.length ?? 0}</p>
            <div className="mt-2 max-h-[55vh] space-y-2 overflow-auto">
              {(templatesQuery.data || []).map((item) => (
                <div key={item.id} className="rounded border border-slate-200 p-2 text-xs">
                  <p className="font-semibold">{item.name}</p>
                  <p className="text-slate-600">Version: {item.version}</p>
                  <div className="mt-1 flex gap-2">
                    <button className="rounded bg-slate-200 px-2 py-1" onClick={() => openEditTemplate(item)}>
                      Editar
                    </button>
                    <button className="rounded bg-rose-600 px-2 py-1 text-white" onClick={() => deleteTemplateMutation.mutate(item.id)}>
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
      ) : (
      <div className="mb-6 rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-700">
        La base de conocimiento es administrada por perfiles <strong>ADMIN</strong>. Como usuario puedes consultar el
        resultado del analisis automatico y editar el anteproyecto solo cuando se cumplan los minimos.
      </div>
      )) : null}

      {currentSection === 'editor' ? (
        <>
          <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-sm font-semibold text-slate-800">Anteproyectos generados</p>
            <p className="mt-1 text-xs text-slate-500">
              Selecciona un anteproyecto previo para continuar edicion, aunque hayas importado nuevas convocatorias.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <select
                className="min-w-[320px] rounded-md border border-slate-300 p-2 text-sm"
                value={documentId}
                onChange={(e) => {
                  const nextDocumentId = e.target.value;
                  setDocumentId(nextDocumentId);
                  const matched = generatedDraftCalls.find((item) => item.documentDraft?.id === nextDocumentId);
                  if (matched) setCallId(matched.id);
                }}
              >
                <option value="">Selecciona un anteproyecto</option>
                {generatedDraftCalls.map((item) => (
                  <option key={item.documentDraft.id} value={item.documentDraft.id}>
                    {item.title} · v{item.documentDraft.version} · {item.status}
                  </option>
                ))}
              </select>
              <button
                className="rounded-md border border-slate-300 px-3 py-2 text-xs text-slate-700"
                onClick={() => callsQuery.refetch()}
                type="button"
              >
                Actualizar lista
              </button>
            </div>
            {generatedDraftCalls.length ? null : (
              <p className="mt-2 text-xs text-slate-500">
                Aun no hay anteproyectos generados. Completa analisis y ejecuta FASE_2 para crear uno.
              </p>
            )}
          </div>

        {canEditDocument ? (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            <button className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white" onClick={() => lockMutationWrapped.mutate()}>
              Tomar bloqueo
            </button>
            <button className="rounded-md bg-slate-700 px-4 py-2 text-sm text-white" onClick={() => unlockMutationWrapped.mutate()}>
              Liberar bloqueo
            </button>
            <button className="rounded-md bg-slate-800 px-4 py-2 text-sm text-white" onClick={() => saveMutation.mutate()}>
              Guardar version
            </button>
            <button className="rounded-md bg-black px-4 py-2 text-sm text-white" onClick={() => exportMutation.mutate()}>
              Exportar PDF
            </button>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <WordEditor content={editorContent} onChange={setDraft} />

            <aside className="rounded-2xl border border-slate-200 bg-white p-4">
              <h2 className="font-heading text-lg font-semibold">Comentarios</h2>
              <textarea
                className="mt-3 h-28 w-full rounded-md border border-slate-300 p-2 text-sm"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Agregar comentario de revision"
              />
              <button
                className="mt-2 rounded-md bg-slate-800 px-3 py-2 text-sm text-white"
                onClick={() => commentMutation.mutate()}
              >
                Guardar comentario
              </button>

              <div className="mt-5 text-xs text-slate-600">
                <p>ID documento: {documentId}</p>
                <p>Version: {documentQuery.data?.version ?? '-'}</p>
                <p>Lock owner: {documentQuery.data?.lockOwner ?? '-'}</p>
              </div>
            </aside>
          </div>

        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-sm text-slate-600">
          {userBlockedForEdit
            ? 'No puedes pasar a la fase de edicion porque no se cumplen los minimos requeridos.'
            : 'Genera la FASE_2 para crear el documento editable tipo Word.'}
        </div>
      )}
      </>) : null}
        </div>
      </section>

      {isAdmin && editModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-2xl">
            <h3 className="font-heading text-lg font-semibold">
              {editModal.type === 'activity'
                ? 'Editar actividad'
                : editModal.type === 'impactTask'
                ? 'Editar tarea de impacto'
                : 'Editar formato'}
            </h3>
            <div className="mt-3 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  {editModal.type === 'impactTask' ? 'Titulo' : 'Nombre'}
                </label>
                <input
                  className="w-full rounded-md border border-slate-300 p-2 text-sm"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>
              {editModal.type === 'activity' ? (
                <>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Region</label>
                    <input
                      className="w-full rounded-md border border-slate-300 p-2 text-sm"
                      value={editRegion}
                      onChange={(e) => setEditRegion(e.target.value)}
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={editDocumented}
                      onChange={(e) => setEditDocumented(e.target.checked)}
                    />
                    Documentada
                  </label>
                </>
              ) : null}
              {editModal.type === 'impactTask' ? (
                <>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Descripcion</label>
                    <textarea
                      className="w-full rounded-md border border-slate-300 p-2 text-sm"
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Prioridad (1-5)</label>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      className="w-full rounded-md border border-slate-300 p-2 text-sm"
                      value={editPriority}
                      onChange={(e) => setEditPriority(Number(e.target.value))}
                    />
                  </div>
                </>
              ) : null}
              {editModal.type === 'formTemplate' ? (
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Schema del formulario (JSON)</label>
                  <textarea
                    className="h-56 w-full rounded-md border border-slate-300 p-2 font-mono text-xs"
                    value={editTemplateSchemaText}
                    onChange={(e) => setEditTemplateSchemaText(e.target.value)}
                  />
                </div>
              ) : null}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button className="rounded-md bg-slate-200 px-3 py-2 text-sm" onClick={closeEditModal}>
                Cancelar
              </button>
              <button className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white" onClick={submitEditModal}>
                Guardar cambios
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <AIBubble documentId={documentId || undefined} callId={callId || undefined} scopeKey={workspaceStorageKey} />
    </main>
  );
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    try {
      const parsed = JSON.parse(error.message) as { message?: string | string[] };
      if (Array.isArray(parsed.message)) return parsed.message.join(', ');
      if (parsed.message) return parsed.message;
    } catch {
      return error.message;
    }
    return error.message;
  }
  return 'Ocurrio un error inesperado.';
}

function downloadBase64File(base64: string, fileName: string, mimeType: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
