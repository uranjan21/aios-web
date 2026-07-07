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

  // Stats
  getStats: async (params?: { domain?: string }) => {
    const res = await api.get('/workspace/stats', { params })
    return res.data
  },
}
