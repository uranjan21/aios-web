import { api } from './client'

export interface Project {
  id: string
  name: string
  description?: string
  domain?: string
  goal_id?: string
  status: string
  priority?: string
  color?: string
  due_date?: string
  labels?: string
  created_at: string
}

/**
 * A block on the weekly time-blocking planner. Added 2026-08-01.
 * Times are local wall-clock strings ("09:00:00"), not instants.
 */
/** A Google Calendar event shown as immovable context in the planner. */
export interface PlanWeekCalendarEvent {
  id: string
  title: string
  /** Naive local ISO — the column is TIMESTAMP WITHOUT TIME ZONE. */
  start_time: string
  end_time: string | null
  location: string | null
  html_link: string | null
}

export interface PlanWeekCalendar {
  /** False = Calendar was never linked. Not the same as having no events. */
  connected: boolean
  events: PlanWeekCalendarEvent[]
}

export interface PlanBlock {
  id: string
  user_id: string
  goal_id?: string | null
  block_date: string
  start_time: string
  end_time: string
  title: string
  domain?: string | null
  is_priority: boolean
  created_at: string
  updated_at: string
}

export interface PlanBlockPayload {
  block_date?: string
  start_time?: string
  end_time?: string
  title?: string
  domain?: string | null
  goal_id?: string | null
  is_priority?: boolean
}

/** A dated checkpoint on the way to a goal. Added 2026-08-01. */
export interface Milestone {
  id: string
  user_id: string
  goal_id?: string | null
  title: string
  description?: string | null
  domain?: string | null
  due_date?: string | null
  status: 'upcoming' | 'at_risk' | 'hit' | 'missed'
  position: number
  created_at: string
  updated_at: string
}

/**
 * Explicit nulls CLEAR a field; omitted keys leave it untouched. Same contract
 * as the other workspace payload types — see the note on TaskPayload.
 */
export interface MilestonePayload {
  title?: string
  description?: string | null
  domain?: string | null
  goal_id?: string | null
  due_date?: string | null
  status?: Milestone['status']
  position?: number
}

export interface Sprint {
  id: string
  project_id: string
  name: string
  goals?: string
  start_date?: string
  end_date?: string
  status: string
  capacity?: number
  created_at: string
}

export interface Task {
  id: string
  project_id?: string
  sprint_id?: string
  goal_id?: string
  title: string
  description?: string
  domain?: string
  status: string
  priority: string
  due_date?: string
  labels?: string
  created_at: string
}

// Update payloads allow `null` so PATCH can explicitly clear a field —
// `undefined` keys are dropped from JSON and the backend never sees them.
export interface ProjectPayload {
  name?: string
  description?: string | null
  domain?: string
  goal_id?: string | null
  status?: string
  priority?: string
  color?: string | null
  due_date?: string | null
  labels?: string | null
}

export interface SprintPayload {
  project_id?: string
  name?: string
  goals?: string | null
  start_date?: string | null
  end_date?: string | null
  status?: string
  capacity?: number | null
}

export interface TaskPayload {
  title?: string
  description?: string | null
  project_id?: string | null
  sprint_id?: string | null
  goal_id?: string | null
  domain?: string
  status?: string
  priority?: string
  due_date?: string | null
  labels?: string | null
}

export const workspaceApi = {
  // Projects
  getProjects: async (): Promise<Project[]> => {
    const res = await api.get('/workspace/projects')
    return res.data
  },
  createProject: async (data: ProjectPayload & { name: string }): Promise<Project> => {
    const res = await api.post('/workspace/projects', data)
    return res.data
  },
  deleteProject: async (id: string): Promise<void> => {
    await api.delete(`/workspace/projects/${id}`)
  },
  updateProject: async (id: string, data: ProjectPayload): Promise<Project> => {
    const res = await api.patch(`/workspace/projects/${id}`, data)
    return res.data
  },

  // Sprints
  getSprints: async (project_id?: string): Promise<Sprint[]> => {
    const res = await api.get('/workspace/sprints', { params: { project_id } })
    return res.data
  },
  createSprint: async (data: SprintPayload & { project_id: string; name: string }): Promise<Sprint> => {
    const res = await api.post('/workspace/sprints', data)
    return res.data
  },
  deleteSprint: async (id: string): Promise<void> => {
    await api.delete(`/workspace/sprints/${id}`)
  },
  updateSprint: async (id: string, data: SprintPayload): Promise<Sprint> => {
    const res = await api.patch(`/workspace/sprints/${id}`, data)
    return res.data
  },

  // Tasks
  getTasks: async (params?: { project_id?: string, sprint_id?: string, domain?: string, goal_id?: string }): Promise<Task[]> => {
    const res = await api.get('/workspace/tasks', { params })
    return res.data
  },
  createTask: async (data: TaskPayload & { title: string }): Promise<Task> => {
    const res = await api.post('/workspace/tasks', data)
    return res.data
  },
  updateTask: async (id: string, data: TaskPayload): Promise<Task> => {
    const res = await api.patch(`/workspace/tasks/${id}`, data)
    return res.data
  },
  deleteTask: async (id: string): Promise<void> => {
    await api.delete(`/workspace/tasks/${id}`)
  },

  // Milestones
  getMilestones: async (params?: { domain?: string, status?: string, goal_id?: string }): Promise<Milestone[]> => {
    const res = await api.get('/workspace/milestones', { params })
    return res.data
  },
  createMilestone: async (data: MilestonePayload & { title: string }): Promise<Milestone> => {
    const res = await api.post('/workspace/milestones', data)
    return res.data
  },
  updateMilestone: async (id: string, data: MilestonePayload): Promise<Milestone> => {
    const res = await api.patch(`/workspace/milestones/${id}`, data)
    return res.data
  },
  deleteMilestone: async (id: string): Promise<void> => {
    await api.delete(`/workspace/milestones/${id}`)
  },

  // Plan blocks (weekly time-blocking planner)
  getPlanBlocks: async (params?: { start?: string, end?: string }): Promise<PlanBlock[]> => {
    const res = await api.get('/workspace/plan-blocks', { params })
    return res.data
  },
  createPlanBlock: async (
    data: PlanBlockPayload & { block_date: string; start_time: string; end_time: string; title: string },
  ): Promise<PlanBlock> => {
    const res = await api.post('/workspace/plan-blocks', data)
    return res.data
  },
  updatePlanBlock: async (id: string, data: PlanBlockPayload): Promise<PlanBlock> => {
    const res = await api.patch(`/workspace/plan-blocks/${id}`, data)
    return res.data
  },
  deletePlanBlock: async (id: string): Promise<void> => {
    await api.delete(`/workspace/plan-blocks/${id}`)
  },
  /**
   * Google Calendar events for the planner's week, as read-only context.
   *
   * READ ONLY, and that is a constraint not a choice: the Google grant is
   * `calendar.readonly`, so a block cannot be pushed back as an event without
   * widening the scope — which invalidates every existing consent.
   *
   * `connected: false` is distinct from an empty `events` array. "No meetings"
   * and "we cannot see your calendar" must not render the same.
   */
  getPlanWeekCalendar: async (params?: { start?: string, end?: string }): Promise<PlanWeekCalendar> => {
    const res = await api.get('/workspace/plan-blocks/calendar', { params })
    return res.data
  },

  // Stats
  getStats: async (params?: { domain?: string }) => {
    const res = await api.get('/workspace/stats', { params })
    return res.data
  },
}
