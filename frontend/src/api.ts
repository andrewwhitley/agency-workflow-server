import type {
  SessionUser, FamilyMember, LabResult, Symptom, Protocol,
  DietEntry, Conversation, ChatMessage, KnowledgeDocument,
  ReferenceData, TrendPoint, DashboardSummary,
  BiomarkerSummary, FoodRecommendationsData,
} from './types';

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  if (res.status === 401) {
    window.location.href = '/auth/login';
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

// Auth
export const getMe = () => apiFetch<{ authenticated: boolean; user?: SessionUser }>('/api/auth/me');

// References
export const getReferences = () => apiFetch<ReferenceData>('/api/health/references');

// Family
export const getFamily = () => apiFetch<FamilyMember[]>('/api/health/family');
export const createFamilyMember = (data: Partial<FamilyMember>) =>
  apiFetch<FamilyMember>('/api/health/family', { method: 'POST', body: JSON.stringify(data) });
export const updateFamilyMember = (id: string, data: Partial<FamilyMember>) =>
  apiFetch<FamilyMember>(`/api/health/family/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteFamilyMember = (id: string) =>
  apiFetch<{ success: boolean }>(`/api/health/family/${id}`, { method: 'DELETE' });

// Labs
export const getLabs = (memberId: string) =>
  apiFetch<LabResult[]>(`/api/health/labs?memberId=${memberId}`);
export const createLab = (data: Record<string, unknown>) =>
  apiFetch<LabResult>('/api/health/labs', { method: 'POST', body: JSON.stringify(data) });
export const deleteLab = (id: string) =>
  apiFetch<{ success: boolean }>(`/api/health/labs/${id}`, { method: 'DELETE' });
export const getMarkerTrends = (memberId: string, marker: string) =>
  apiFetch<TrendPoint[]>(`/api/health/markers/trends?memberId=${memberId}&marker=${encodeURIComponent(marker)}`);

// Symptoms
export const getSymptoms = (memberId: string) =>
  apiFetch<Symptom[]>(`/api/health/symptoms?memberId=${memberId}`);
export const createSymptom = (data: Record<string, unknown>) =>
  apiFetch<Symptom>('/api/health/symptoms', { method: 'POST', body: JSON.stringify(data) });
export const deleteSymptom = (id: string) =>
  apiFetch<{ success: boolean }>(`/api/health/symptoms/${id}`, { method: 'DELETE' });

// Protocols
export const getProtocols = (memberId: string) =>
  apiFetch<Protocol[]>(`/api/health/protocols?memberId=${memberId}`);
export const createProtocol = (data: Record<string, unknown>) =>
  apiFetch<Protocol>('/api/health/protocols', { method: 'POST', body: JSON.stringify(data) });
export const updateProtocol = (id: string, data: Record<string, unknown>) =>
  apiFetch<Protocol>(`/api/health/protocols/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteProtocol = (id: string) =>
  apiFetch<{ success: boolean }>(`/api/health/protocols/${id}`, { method: 'DELETE' });

// Diet
export const getDiet = (memberId: string) =>
  apiFetch<DietEntry[]>(`/api/health/diet?memberId=${memberId}`);
export const createDietEntry = (data: Record<string, unknown>) =>
  apiFetch<DietEntry>('/api/health/diet', { method: 'POST', body: JSON.stringify(data) });
export const deleteDietEntry = (id: string) =>
  apiFetch<{ success: boolean }>(`/api/health/diet/${id}`, { method: 'DELETE' });

// Chat
export const getConversations = (memberId: string) =>
  apiFetch<Conversation[]>(`/api/health/chat/conversations?memberId=${memberId}`);
export const createConversation = (memberId: string) =>
  apiFetch<Conversation>('/api/health/chat/conversations', {
    method: 'POST', body: JSON.stringify({ family_member_id: memberId }),
  });
export const getMessages = (conversationId: string) =>
  apiFetch<ChatMessage[]>(`/api/health/chat/conversations/${conversationId}/messages`);
export const deleteConversation = (id: string) =>
  apiFetch<{ success: boolean }>(`/api/health/chat/conversations/${id}`, { method: 'DELETE' });

// Streaming chat - returns EventSource-like interface
export function streamChat(
  message: string,
  familyMemberId: string,
  conversationId?: string,
  onEvent?: (event: { type: string; content: string; conversationId?: string }) => void,
): AbortController {
  const controller = new AbortController();
  fetch('/api/health/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, family_member_id: familyMemberId, conversation_id: conversationId }),
    signal: controller.signal,
  }).then(async (res) => {
    if (!res.ok || !res.body) {
      onEvent?.({ type: 'error', content: 'Failed to start chat' });
      return;
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const event = JSON.parse(line.slice(6));
            onEvent?.(event);
          } catch { /* skip */ }
        }
      }
    }
  }).catch((err) => {
    if (err.name !== 'AbortError') {
      onEvent?.({ type: 'error', content: err.message });
    }
  });
  return controller;
}

// Knowledge
export const getKnowledge = () =>
  apiFetch<KnowledgeDocument[]>('/api/health/knowledge');
export const uploadKnowledge = (data: Record<string, unknown>) =>
  apiFetch<KnowledgeDocument>('/api/health/knowledge', { method: 'POST', body: JSON.stringify(data) });
export const deleteKnowledge = (id: string) =>
  apiFetch<{ success: boolean }>(`/api/health/knowledge/${id}`, { method: 'DELETE' });

// Dashboard summary
export const getDashboard = (memberId: string) =>
  apiFetch<DashboardSummary>(`/api/health/dashboard?memberId=${memberId}`);

// Biomarker summary
export const getBiomarkerSummary = (memberId: string) =>
  apiFetch<BiomarkerSummary>(`/api/health/biomarkers/summary?memberId=${memberId}`);

// Food recommendations
export const getFoodRecommendations = (memberId: string) =>
  apiFetch<FoodRecommendationsData>(`/api/health/foods/recommendations?memberId=${memberId}`);
