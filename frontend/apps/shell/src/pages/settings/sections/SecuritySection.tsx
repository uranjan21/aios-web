import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@ct/shared/api/client'
import { useAuthStore } from '@ct/shared/stores/authStore'
import { Button } from '@ledgr/ui'
import { Row, Section, FormInput } from '../shared'

// ── Security / change password ────────────────────────────────────────────────

export function SecuritySection() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [busy, setBusy] = useState(false)

  // Only email-auth users can change password; Google users have no local password.
  if (user?.auth_provider !== 'email') return null

  const submit = async () => {
    if (!current || next.length < 8) return
    setBusy(true)
    try {
      await api.post('/auth/change-password', { current, new: next })
      toast.success('Password changed — please log in again')
      setCurrent('')
      setNext('')
      // Backend re-issues the cookie but the logout flow is safer UX
      setTimeout(() => { logout(); navigate('/login') }, 1500)
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      toast.error(msg ?? 'Failed to change password')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Section title="Security">
      <Row label="Current password">
        <FormInput
          type="password"
          value={current}
          onChange={e => setCurrent(e.target.value)}
          placeholder="Current password"
          autoComplete="current-password"
        />
      </Row>
      <Row label="New password">
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <FormInput
            type="password"
            value={next}
            onChange={e => setNext(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()}
            placeholder="Min. 8 characters"
            autoComplete="new-password"
          />
          <Button
            size="sm"
            variant="primary"
            onClick={submit}
            disabled={busy || !current || next.length < 8}
          >
            <Lock size={12} style={{ marginRight: 4 }} /> Update
          </Button>
        </div>
      </Row>
    </Section>
  )
}
