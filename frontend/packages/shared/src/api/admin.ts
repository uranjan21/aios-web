import { api } from './client'

export interface AdminUser {
  id: string
  email: string
  name: string
  picture_url: string | null
  auth_provider: string
  is_admin: boolean
  created_at: string | null
  plan: string
  plan_status: string
  stripe_customer_id: string | null
  current_period_end: string | null
}

export interface AdminStats {
  total_users: number
  free_users: number
  pro_users: number
  household_users: number
}

export interface UsersResponse {
  users: AdminUser[]
  total: number
  limit: number
  offset: number
}

export const adminApi = {
  stats: () =>
    api.get<AdminStats>('/admin/stats').then(r => r.data),

  listUsers: (params: { search?: string; limit?: number; offset?: number } = {}) =>
    api.get<UsersResponse>('/admin/users', { params }).then(r => r.data),

  overridePlan: (userId: string, plan: string, status = 'active') =>
    api.patch<AdminUser>(`/admin/users/${userId}/plan`, { plan, status }).then(r => r.data),

  toggleAdmin: (userId: string, is_admin: boolean) =>
    api.patch<AdminUser>(`/admin/users/${userId}/admin`, { is_admin }).then(r => r.data),

  deleteUser: (userId: string) =>
    api.delete(`/admin/users/${userId}`).then(r => r.data),
}
