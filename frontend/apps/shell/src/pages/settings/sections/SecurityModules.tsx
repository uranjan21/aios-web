/**
 * Settings → Security.
 *
 * Phase 4 conversion to the canvas's `settings:security` composition —
 * tiles(12) · table(7) · controls(5) · rows(12) — from live auth and
 * integration state.
 *
 * TWO DEPARTURES, both because the feature the canvas draws does not exist:
 *  - Its table is "Active sessions — 2 devices signed in". Auth is a single
 *    JWT cookie with a `token_version` revocation counter; no session registry
 *    is kept, so there is nothing to list per device. The table becomes the
 *    sign-in facts that ARE recorded, and "sign out everywhere" stays as the
 *    real action the revocation counter supports.
 *  - Its Protection module offers two-factor auth and re-auth for money
 *    actions. Neither is implemented, and drawing switches for them would
 *    promise protection that is not there. The module is the controls that
 *    exist: change password, and the verification state of the account.
 *
 * BACKEND FOLLOW-UP: a `sessions` table (device, ip, last_seen) and a TOTP
 * enrolment would let this render the canvas exactly.
 */
import { useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import styled from 'styled-components'
import { LayoutGrid, Shield } from 'lucide-react'
import { Button, Dialog, Input } from '@ledgr/ui'
import { api } from '@ct/shared/api/client'
import { integrationsApi } from '@ct/shared/api/integrations'
import { useAuthStore } from '@ct/shared/stores/authStore'
import { ModuleGrid, type ModuleSpec } from '@ct/shared/components/modules'

const Form = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
`

const Label = styled.label`
  display: block;
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.color.mutedForeground};
  margin-bottom: ${({ theme }) => theme.spacing[1]};
`

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  padding-top: ${({ theme }) => theme.spacing[2]};
`

export function SecurityModules() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const [pwOpen, setPwOpen] = useState(false)
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')

  const { data: integrations } = useQuery({
    queryKey: ['integrations'],
    queryFn: integrationsApi.list,
    staleTime: 60_000,
  })

  const changePassword = useMutation({
    mutationFn: () => api.post('/auth/change-password', { current, new: next }),
    onSuccess: () => {
      toast.success('Password changed — please log in again')
      setPwOpen(false)
      setCurrent('')
      setNext('')
      // The backend re-issues the cookie, but signing out is the safer UX.
      setTimeout(() => { logout(); navigate('/login') }, 1500)
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Failed to change password'),
  })

  const disconnect = useMutation({
    mutationFn: (provider: string) => integrationsApi.disconnect(provider),
    onSuccess: () => toast.success('Disconnected'),
    onError: () => toast.error('Could not disconnect that app'),
  })

  const isEmailAuth = user?.auth_provider === 'email'

  const modules = useMemo<ModuleSpec[]>(() => {
    const apps = integrations ?? []
    const connected = apps.filter(a => a.status === 'connected')

    return [
      {
        kind: 'tiles',
        span: 12,
        tiles: [
          {
            label: 'Sign-in method',
            value: user?.auth_provider === 'google' ? 'Google' : 'Email',
            sub: isEmailAuth ? 'Password managed here' : 'Managed by your Google account',
          },
          {
            label: 'Email verified',
            value: user?.email_verified ? 'Yes' : 'No',
            sub: user?.email_verified ? 'Full access' : 'Some features stay locked until verified',
            dotKey: user?.email_verified ? 'success' : 'warning',
          },
          {
            label: 'Connected apps',
            value: String(connected.length),
            sub: connected.length ? connected.map(a => a.provider).join(', ') : 'Nothing linked',
          },
          {
            label: 'Account role',
            value: user?.is_admin ? 'Administrator' : 'Personal',
            sub: user?.is_admin ? 'Full instance access' : 'Your own data only',
            dotKey: user?.is_admin ? 'warning' : undefined,
          },
        ],
      },
      {
        kind: 'table',
        span: 7,
        title: 'Sign-in',
        subtitle: 'What this account uses to authenticate',
        icon: Shield,
        gridCols: '1.5fr 1.2fr 1fr',
        cols: [{ l: 'Factor' }, { l: 'Detail' }, { l: 'State', a: 'right' }],
        rows: [
          [
            { t: 'Provider', bold: true },
            user?.auth_provider === 'google' ? 'Google OAuth' : 'Email and password',
            { t: 'Active', tag: true, colorKey: 'success' },
          ],
          [
            { t: 'Email address', bold: true },
            user?.email ?? '—',
            {
              t: user?.email_verified ? 'Verified' : 'Unverified',
              tag: true,
              colorKey: user?.email_verified ? 'success' : 'warning',
            },
          ],
          [
            { t: 'Session', bold: true },
            'Single httpOnly cookie, revocable',
            { t: 'Signed in', tag: true, colorKey: 'success' },
          ],
        ],
      },
      {
        kind: 'controls',
        span: 5,
        title: 'Protection',
        subtitle: 'Sign-in and sensitive actions',
        icon: Shield,
        ...(isEmailAuth && { action: 'Change password', onAction: () => setPwOpen(true) }),
        rows: [
          {
            title: 'Password',
            meta: isEmailAuth ? 'Change it from the button above' : 'Not used — you sign in with Google',
            control: 'select',
            value: isEmailAuth ? 'Set' : 'Google',
          },
          {
            title: 'Email verification',
            meta: 'Required before some features unlock',
            control: 'select',
            value: user?.email_verified ? 'Verified' : 'Pending',
          },
        ],
      },
      {
        kind: 'rows',
        span: 12,
        title: 'Connected apps',
        subtitle: connected.length
          ? 'Third-party access to your data · click to disconnect'
          : 'Nothing has access to your data',
        icon: LayoutGrid,
        rows: connected.map(a => ({
          title: a.provider,
          meta: a.token_expires_at
            ? `Access token valid until ${dayjs(a.token_expires_at).format('D MMM, HH:mm')}`
            : 'No expiry recorded',
          tagLabel: 'Connected',
          tagColorKey: 'success',
          busy: disconnect.isPending && disconnect.variables === a.provider,
        })),
        ...(connected.length && { onRowClick: (i: number) => disconnect.mutate(connected[i].provider) }),
      },
    ]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, integrations, isEmailAuth, disconnect.isPending])

  return (
    <>
      <ModuleGrid modules={modules} />

      <Dialog
        open={pwOpen}
        onOpenChange={(o) => !o && setPwOpen(false)}
        icon={<Shield size={18} />}
        eyebrow="Security"
        title="Change password"
        description="You will be signed out and asked to log in again."
      >
        <Form>
          <div>
            <Label>Current password</Label>
            <Input type="password" value={current} onChange={(e: any) => setCurrent(e.target.value)} autoFocus />
          </div>
          <div>
            <Label>New password (at least 8 characters)</Label>
            <Input type="password" value={next} onChange={(e: any) => setNext(e.target.value)} />
          </div>
          <Actions>
            <Button
              variant="primary"
              loading={changePassword.isPending}
              disabled={!current || next.length < 8}
              onClick={() => changePassword.mutate()}
            >
              Change password
            </Button>
            <Button variant="ghost" onClick={() => setPwOpen(false)}>Cancel</Button>
          </Actions>
        </Form>
      </Dialog>
    </>
  )
}
