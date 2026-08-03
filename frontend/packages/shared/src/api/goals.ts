import { api } from './client'

export interface MacroGoal {
  id: string;
  title: string;
  description?: string;
  category: string;
  target_date?: string;
  status: string;
  priority?: string;
  created_at: string;
  /**
   * Most recent score posted by the Weekly Review, or null when the goal has
   * never been scored. The area Overview modules fall back to the goal's
   * milestone completion ratio in that case.
   */
  progress_score?: number | null;
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
  create: (data: { title: string; category: string; description?: string; target_date?: string; priority?: string }) =>
    api.post<MacroGoal>('/goals', data).then(r => r.data),
  // Nulls are allowed so PATCH can explicitly clear description/target_date.
  update: (goalId: string, data: Partial<{ title: string; category: string; description: string | null; target_date: string | null; status: string; priority: string }>) =>
    api.patch<MacroGoal>(`/goals/${goalId}`, data).then(r => r.data),
  remove: (goalId: string) => api.delete(`/goals/${goalId}`).then(r => r.data),
  addProgress: (goalId: string, data: { progress_score: number; ai_insight?: string }) =>
    api.post<GoalProgress>(`/goals/${goalId}/progress`, data).then(r => r.data),
}
