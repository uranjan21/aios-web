import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, Trash2, User } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@ct/shared/api/client'
import { useAuthStore } from '@ct/shared/stores/authStore'
import { logoutAndRedirect } from '@ct/shared/lib/logout'
import { Card as GlassCard, Button } from '@ledgr/ui'
import { FormInput } from '../shared'

// ── Danger zone / account deletion (GDPR right to erasure) ──────────────────────

function DangerZone() {
  const logout = useAuthStore(s => s.logout)
  const navigate = useNavigate()
  const [confirming, setConfirming] = useState(false)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)

  const deleteAccount = async () => {
    if (text !== 'DELETE') return
    setBusy(true)
    try {
      await api.delete('/auth/me')
      toast.success('Account deleted')
      logout()
      navigate('/')
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      toast.error(msg ?? 'Failed to delete account')
      setBusy(false)
    }
  }

  return (
    <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)' }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--destructive)', marginBottom: 6 }}>
        Delete account
      </div>
      <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginBottom: 10 }}>
        Permanently erase your account and all associated data. This cannot be undone.
      </div>
      {!confirming ? (
        <Button variant="destructive" size="sm" onClick={() => setConfirming(true)}>
          <Trash2 size={12} style={{ marginRight: 4 }} /> Delete my account
        </Button>
      ) : (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <FormInput
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Type DELETE to confirm"
            aria-label="Type DELETE to confirm account deletion"
          />
          <Button variant="destructive" size="sm" disabled={busy || text !== 'DELETE'} onClick={deleteAccount}>
            Confirm
          </Button>
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => { setConfirming(false); setText('') }}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  )
}

// ── Account section ───────────────────────────────────────────────────────────

export function AccountSection() {
  const navigate = useNavigate()
  const handleLogout = () => logoutAndRedirect(navigate)

  return (
    <GlassCard
      variant="glass"
      title="Account"
      subtitle="Sign-out and account-level controls"
      icon={<User size={16} />}
      action={
        <Button variant="destructive" size="sm" onClick={handleLogout}>
          <LogOut size={12} /> Sign out
        </Button>
      }
    >
      <div style={{ padding: '14px 20px', fontSize: '12px', color: 'var(--muted-foreground)' }}>
        Signing out will invalidate your current session across all devices.
      </div>
      <DangerZone />
    </GlassCard>
  )
}
