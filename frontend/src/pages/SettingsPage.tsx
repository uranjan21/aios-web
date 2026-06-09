import { api } from '@/api/client'
import { useAuthStore } from '@/stores/authStore'
import { useNavigate } from 'react-router-dom'

export function SettingsPage() {
  const logout = useAuthStore(s => s.logout)
  const navigate = useNavigate()

  const handleLogout = async () => {
    await api.post('/auth/logout')
    logout()
    navigate('/login')
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Configure your AIOS instance</p>
      </div>

      <div className="bg-card border border-border rounded-xl divide-y divide-border">
        <div className="p-5">
          <h2 className="text-sm font-semibold mb-1">Vault Path</h2>
          <p className="text-xs text-muted-foreground">
            Set via <code className="bg-muted px-1 rounded">VAULT_PATH</code> environment variable in your .env file.
            Restart the backend after changing it.
          </p>
        </div>
        <div className="p-5">
          <h2 className="text-sm font-semibold mb-1">Claude Token Budget</h2>
          <p className="text-xs text-muted-foreground">
            Configured via <code className="bg-muted px-1 rounded">CLAUDE_DAILY_TOKEN_LIMIT</code> env var (default: 200,000 tokens/day).
          </p>
        </div>
        <div className="p-5">
          <h2 className="text-sm font-semibold mb-1">Rate Limits</h2>
          <p className="text-xs text-muted-foreground">
            Chat: 20 req/min · Agents: 5 req/min · Auth: 10 req/min · Other: 120 req/min
          </p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <h2 className="text-sm font-semibold text-destructive mb-1">Danger Zone</h2>
        <button
          onClick={handleLogout}
          className="text-sm px-4 py-2 rounded-lg border border-destructive/50 text-destructive hover:bg-destructive/10 transition"
        >
          Sign out
        </button>
      </div>
    </div>
  )
}
