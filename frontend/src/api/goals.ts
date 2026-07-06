import { api } from './client'

export interface MacroGoal {
  id: string;
  title: string;
  description?: string;
  category: string;
  target_date?: string;
  status: string;
  created_at: string;
}

export interface GoalProgress {
  id: string;
  goal_id: string;
  date_recorded: string;
  progress_score: number;
  ai_insight?: string;
  created_at: string;
}

export const goalsApi = {
  list: () => api.get<MacroGoal[]>('/goals').then(r => r.data),
  create: (data: { title: string; category: string; description?: string; target_date?: string }) => 
    api.post<MacroGoal>('/goals', data).then(r => r.data),
  getProgress: (goalId: string) => api.get<GoalProgress[]>(`/goals/${goalId}/progress`).then(r => r.data),
  addProgress: (goalId: string, data: { progress_score: number; ai_insight?: string }) =>
    api.post<GoalProgress>(`/goals/${goalId}/progress`, data).then(r => r.data),
}
