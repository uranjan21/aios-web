import { api } from './client'

export interface AgentAction {
  id: string;
  source_domain: string;
  action_type: string;
  payload: Record<string, any>;
  status: string; // pending, approved, executed, rejected
  ai_explanation?: string;
  created_at: string;
}

export const actionsApi = {
  list: (status?: string) => api.get<AgentAction[]>('/actions', { params: { status } }).then(r => r.data),
  approve: (actionId: string) => api.post<AgentAction>(`/actions/${actionId}/approve`).then(r => r.data),
  reject: (actionId: string) => api.post<AgentAction>(`/actions/${actionId}/reject`).then(r => r.data),
}
