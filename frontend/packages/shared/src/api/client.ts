import axios from 'axios'

export const api = axios.create({
  baseURL: '/api',
  withCredentials: true, // send httpOnly cookie automatically
  headers: { 'Content-Type': 'application/json' },
})

let _refreshing: Promise<boolean> | null = null

async function tryRefresh(): Promise<boolean> {
  if (_refreshing) return _refreshing
  _refreshing = api.post('/auth/refresh').then(() => true).catch(() => false)
  const ok = await _refreshing
  _refreshing = null
  return ok
}

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const status = err.response?.status
    const url: string = err.config?.url ?? ''
    // Don't retry refresh calls themselves — that would loop forever.
    if (status === 401 && !url.includes('/auth/refresh') && !window.location.pathname.startsWith('/login')) {
      const refreshed = await tryRefresh()
      if (refreshed) {
        // Re-issue the original request with the new cookie.
        return api.request(err.config)
      }
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)
