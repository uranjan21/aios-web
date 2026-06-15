import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/api/client'
import { useAuthStore } from '@/stores/authStore'

export function LoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const setAuthenticated = useAuthStore(s => s.setAuthenticated)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await api.post('/auth/login', { password })
      setAuthenticated(true)
      navigate('/')
    } catch {
      setError('Invalid password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--page-bg))] p-4">
      <div className="w-full max-w-[400px]">
        {/* Brand */}
        <div className="text-center mb-10 fade-in-up">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-amber-600 shadow-glow items-center justify-center mb-5">
            <span className="text-[15px] font-bold text-primary-foreground tracking-tight">AI</span>
          </div>
          <h1 className="font-display text-[44px] leading-none text-foreground">aios</h1>
          <p className="text-muted-foreground text-[13px] mt-2.5 tracking-[0.18em] uppercase">Your life, beautifully run</p>
        </div>

        {/* Card */}
        <form
          onSubmit={handleSubmit}
          className="bg-card border-0 rounded-2xl shadow-premium-md p-6 space-y-4 fade-in-up delay-100"
        >
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Passphrase</span>
            <input
              type="password"
              placeholder="••••••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="mt-2 w-full px-4 py-3.5 rounded-xl bg-muted/50 border border-border text-foreground text-[15px] placeholder:text-muted-foreground/50 focus:outline-none focus:ring-[3px] focus:ring-primary/20 focus:border-primary/50 transition-all"
              autoFocus
              required
            />
          </label>
          {error && <p className="text-destructive text-[13px] text-center">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-gradient-to-br from-primary to-amber-600 text-primary-foreground text-[15px] font-semibold shadow-glow hover:shadow-premium-hover hover:-translate-y-px disabled:opacity-50 transition-all duration-300"
          >
            {loading ? 'Unlocking…' : 'Enter'}
          </button>
        </form>

        <p className="text-center text-[11px] text-muted-foreground/60 mt-6 fade-in-up delay-200">
          Finance · Health · Career · Business · Content
        </p>
      </div>
    </div>
  )
}
