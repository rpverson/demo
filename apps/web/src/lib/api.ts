const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
const DEFAULT_TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID || 'demo-tenant';
const DEFAULT_USER_ID = process.env.NEXT_PUBLIC_USER_ID || 'demo-user';
const DEFAULT_ROLE = (process.env.NEXT_PUBLIC_USER_ROLE || 'ADMIN').toUpperCase() === 'USER' ? 'USER' : 'ADMIN';

type Role = 'ADMIN' | 'USER';
type SessionContext = { tenantId: string; userId: string; role: Role; token?: string };

const sessionContext: SessionContext = {
  tenantId: DEFAULT_TENANT_ID,
  userId: DEFAULT_USER_ID,
  role: DEFAULT_ROLE,
  token: undefined,
};

export function setSessionContext(next: Partial<SessionContext>) {
  if (next.tenantId) sessionContext.tenantId = next.tenantId;
  if (next.userId) sessionContext.userId = next.userId;
  if (next.role) sessionContext.role = next.role;
  if (Object.prototype.hasOwnProperty.call(next, 'token')) {
    sessionContext.token = next.token || undefined;
  }
}

export function getSessionContext() {
  return { ...sessionContext };
}

export function clearSessionContext() {
  sessionContext.tenantId = DEFAULT_TENANT_ID;
  sessionContext.userId = DEFAULT_USER_ID;
  sessionContext.role = DEFAULT_ROLE;
  sessionContext.token = undefined;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'x-tenant-id': sessionContext.tenantId,
      'x-user-id': sessionContext.userId,
      'x-user-role': sessionContext.role,
      ...(sessionContext.token ? { 'x-auth-token': sessionContext.token } : {}),
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

async function requestPublic<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const api = {
  login: (payload: { username: string; password: string; tenantId?: string }) =>
    request<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  importCall: (payload: {
    title: string;
    sourceType: 'URL' | 'PDF' | 'DOCX' | 'MD';
    sourceUrl?: string;
    sourceStorageKey?: string;
    markdownContent?: string;
    fileName?: string;
  }) =>
    request<any>('/calls/import', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  listCalls: () => request<any[]>('/calls'),
  deleteCall: (id: string) => request<any>(`/calls/${id}`, { method: 'DELETE' }),
  createCallCollabShare: (id: string) => request<any>(`/calls/${id}/collab-share`, { method: 'POST' }),
  analyzePhase1: (callId: string) => request<any>(`/calls/${callId}/analyze-phase-1`, { method: 'POST' }),
  analyzePhase1Llm: (callId: string) => request<any>(`/calls/${callId}/analyze-phase-1-llm`, { method: 'POST' }),
  autoProcess: (callId: string) => request<any>(`/calls/${callId}/auto-process`, { method: 'POST' }),
  getAnalysis: (callId: string) => request<any>(`/calls/${callId}/analysis`),
  getGaps: (callId: string) => request<any>(`/calls/${callId}/gaps`),
  getPendingForms: (callId: string) => request<any>(`/calls/${callId}/pending-forms`),
  submitCallForm: (
    callId: string,
    payload: { activityId: string; formTemplateId: string; response: Record<string, unknown> },
  ) =>
    request<any>(`/calls/${callId}/forms/submit`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  confirmMinimumPlan: (callId: string) =>
    request<any>(`/calls/${callId}/minimum-plan/confirm`, { method: 'POST' }),
  recommendImpactTasks: (callId: string) =>
    request<any>(`/calls/${callId}/recommend-impact-tasks`, { method: 'POST' }),
  generateDraftLlm: (callId: string) => request<any>(`/calls/${callId}/generate-draft-llm`, { method: 'POST' }),
  getDraftQuality: (callId: string) => request<any>(`/calls/${callId}/draft-quality`),
  generatePhase2: (callId: string) => request<any>(`/calls/${callId}/generate-phase-2`, { method: 'POST' }),
  createActivity: (payload: { name: string; region: string; documented: boolean }) =>
    request<any>('/activities', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  listActivities: () => request<any[]>('/activities'),
  listActivityFormTemplates: (activityId: string) => request<any[]>(`/activities/${activityId}/form-templates`),
  linkActivityFormTemplate: (activityId: string, payload: { formTemplateId: string; required?: boolean }) =>
    request<any>(`/activities/${activityId}/form-templates`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  unlinkActivityFormTemplate: (activityId: string, formTemplateId: string) =>
    request<any>(`/activities/${activityId}/form-templates/${formTemplateId}`, {
      method: 'DELETE',
    }),
  updateActivity: (id: string, payload: { name?: string; region?: string; documented?: boolean }) =>
    request<any>(`/activities/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  deleteActivity: (id: string) => request<any>(`/activities/${id}`, { method: 'DELETE' }),
  createImpactTask: (payload: { title: string; description: string; priority?: number }) =>
    request<any>('/impact-tasks', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  listImpactTasks: () => request<any[]>('/impact-tasks'),
  updateImpactTask: (id: string, payload: { title?: string; description?: string; priority?: number }) =>
    request<any>(`/impact-tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  deleteImpactTask: (id: string) => request<any>(`/impact-tasks/${id}`, { method: 'DELETE' }),
  createFormTemplate: (payload: { name: string; schemaJson: Record<string, unknown> }) =>
    request<any>('/form-templates', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  listFormTemplates: () => request<any[]>('/form-templates'),
  updateFormTemplate: (id: string, payload: { name?: string; schemaJson?: Record<string, unknown> }) =>
    request<any>(`/form-templates/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  deleteFormTemplate: (id: string) => request<any>(`/form-templates/${id}`, { method: 'DELETE' }),
  getDocument: (id: string) => request<any>(`/documents/${id}`),
  lockDocument: (id: string) => request<any>(`/documents/${id}/lock`, { method: 'POST' }),
  unlockDocument: (id: string) => request<any>(`/documents/${id}/unlock`, { method: 'POST' }),
  updateDocumentContent: (id: string, markdownSource: string, astSnapshot?: unknown) =>
    request<any>(`/documents/${id}/content`, {
      method: 'PUT',
      body: JSON.stringify({ markdownSource, astSnapshot }),
    }),
  addComment: (id: string, body: string) =>
    request<any>(`/documents/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    }),
  exportPdf: (id: string) => request<any>(`/exports/${id}/pdf`, { method: 'POST' }),
  aiChat: (message: string, context?: { documentId?: string; callId?: string }) =>
    request<any>('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ ...context, message }),
    }),
  publicListPendingForms: (callId: string, token: string) =>
    requestPublic<any>(`/calls/public/${callId}/pending-forms?token=${encodeURIComponent(token)}`),
  publicSubmitCallForm: (
    callId: string,
    payload: {
      token: string;
      activityId: string;
      formTemplateId: string;
      response: Record<string, unknown>;
      assistantName?: string;
    },
  ) =>
    requestPublic<any>(`/calls/public/${callId}/forms/submit`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
