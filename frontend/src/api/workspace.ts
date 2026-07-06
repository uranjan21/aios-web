import { api } from './client'

export interface Project {
  id: string
  name: string
  description?: string
  domain?: string
  goal_id?: string
  status: string
  created_at: string
}

export interface Sprint {
  id: string
  project_id: string
  name: string
  start_date?: string
  end_date?: string
  status: string
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
  created_at: string
}

export const workspaceApi = {
  // Projects
  getProjects: async (): Promise<Project[]> => {
    const res = await api.get('/workspace/projects')
    return res.data
  },
  createProject: async (data: { name: string; description?: string; domain?: string; goal_id?: string }): Promise<Project> => {
    const res = await api.post('/workspace/projects', data)
    return res.data
  },
  deleteProject: async (id: string): Promise<void> => {
    await api.delete(`/workspace/projects/${id}`)
  },

  // Sprints
  getSprints: async (project_id?: string): Promise<Sprint[]> => {
    const res = await api.get('/workspace/sprints', { params: { project_id } })
    return res.data
  },
  createSprint: async (data: Partial<Sprint>): Promise<Sprint> => {
    const res = await api.post('/workspace/sprints', data)
    return res.data
  },
  deleteSprint: async (id: string): Promise<void> => {
    await api.delete(`/workspace/sprints/${id}`)
  },

  // Tasks
  getTasks: async (params?: { project_id?: string, sprint_id?: string, domain?: string, goal_id?: string }): Promise<Task[]> => {
    const res = await api.get('/workspace/tasks', { params })
    return res.data
  },
  createTask: async (data: { title: string; project_id?: string; sprint_id?: string; goal_id?: string; priority?: string }): Promise<Task> => {
    const res = await api.post('/workspace/tasks', data)
    return res.data
  },
  updateTask: async (id: string, data: Partial<Task>): Promise<Task> => {
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
