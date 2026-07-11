import { useEffect, useRef, useState } from 'react'
import { Save } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/api/client'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@ledgr/ui'
import { Row, Section, FormInput } from '../shared'

// ── Profile section ──────────────────────────────────────────────────────────

export function ProfileSection() {
  const { user, setUser } = useAuthStore()
  const [name, setName] = useState(user?.name ?? '')
  const [busy, setBusy] = useState(false)

  // Keep local state in sync if user changes externally
  const prevName = useRef(user?.name ?? '')
  useEffect(() => {
    if (user?.name && user.name !== prevName.current) {
      setName(user.name)
      prevName.current = user.name
    }
  }, [user?.name])

  const save = async () => {
    if (!name.trim()) return
    setBusy(true)
    try {
      const { data } = await api.patch('/auth/profile', { name: name.trim() })
      setUser(data)
      toast.success('Profile updated')
    } catch {
      toast.error('Failed to update profile')
    } finally {
      setBusy(false)
    }
  }

  const dirty = name.trim() !== (user?.name ?? '')

  return (
    <Section title="Profile">
      <Row label="Display name">
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <FormInput
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && dirty && save()}
            placeholder="Your name"
            maxLength={80}
          />
          {dirty && (
            <Button size="sm" variant="primary" onClick={save} disabled={busy}>
              <Save size={12} style={{ marginRight: 4 }} /> Save
            </Button>
          )}
        </div>
      </Row>
      <Row label="Email">
        <span style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>{user?.email ?? '—'}</span>
      </Row>
      <Row label="Sign-in method">
        <span style={{ fontSize: 13, color: 'var(--muted-foreground)', textTransform: 'capitalize' }}>
          {user?.auth_provider ?? '—'}
        </span>
      </Row>
    </Section>
  )
}
