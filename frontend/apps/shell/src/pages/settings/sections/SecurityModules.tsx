/**
 * Settings → Security & privacy.
 *
 * REBUILT 2026-08-03. The old version said everything twice: a tiles row, then
 * a "Sign-in" table restating the same three facts, then a "Protection" module
 * whose two `control: 'select'` rows echoed the tiles a third time — and that
 * control has no handler (`ShellKinds.ControlsKind`), so it rendered a chevron
 * chip that could not be opened. Its "Connected apps" module moved to the new
 * Connections tab, which can also connect them.
 *
 * What arrived instead is account deletion. It used to sit in the `general`
 * tab beside the display-name field, which is the wrong neighbourhood for the
 * one irreversible action in the app; it belongs with the password and the
 * session controls.
 *
 * TWO THINGS THE UI DELIBERATELY DOES NOT CLAIM: there is no session registry
 * (auth is one httpOnly cookie plus a `token_version` revocation counter, so
 * per-device sessions cannot be listed) and no TOTP enrolment. Drawing either
 * would promise protection that is not implemented.
 */
import { useMemo, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import { KeyRound, ShieldAlert, Trash2 } from 'lucide-react'
import { Button, Dialog, Input } from '@ledgr/ui'
import { api } from '@ct/shared/api/client'
import { useAuthStore } from '@ct/shared/stores/authStore'
import { logoutAndRedirect } from '@ct/shared/lib/logout'
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

const Warning = styled.p`
  margin: 0;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.color.destructive};
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

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')

  /*
   * Negated from the Google check rather than tested as `=== 'email'`, so every
   * consumer here answers one question the same way. The two spellings used to
   * coexist and could disagree — an unloaded user read "Email and password"
   * beside "Managed by your Google account".
   */
  const isEmailAuth = user?.auth_provider !== 'google'

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

  const deleteAccount = useMutation({
    mutationFn: () => api.delete('/auth/me'),
    onSuccess: () => {
      toast.success('Account deleted')
      logout()
      navigate('/')
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Failed to delete account'),
  })

  /*
   * TWO cards, and every row on both is a button.
   *
   * A `tiles` row used to sit on top with sign-in method, verification state
   * and account role. All three were restated in the rows below it, and a tile
   * cannot be clicked — so it was three cards of text above two cards saying
   * the same thing. Role is Profile's fact and is stated there.
   *
   * A "Session" row also went: "One httpOnly, SameSite=Strict cookie" is how
   * auth is implemented, not something the user sets or can act on. Sign out —
   * which is the actionable half of it — is a row on the second card.
   */
  const modules = useMemo<ModuleSpec[]>(() => [
    {
      kind: 'rows',
      span: 7,
      title: 'Sign-in',
      subtitle: isEmailAuth
        ? 'Your credentials for this account'
        : 'Your Google account holds these — change them there',
      icon: KeyRound,
      ...(isEmailAuth && { action: 'Change password', onAction: () => setPwOpen(true) }),
      /*
       * NO `onRowClick` here, deliberately. It turns EVERY row in a module into
       * a button, and only the password is actionable — there is no
       * resend-verification endpoint, so the email row can never do anything.
       * Wiring it would have made the email row look pressable and then ignore
       * the press, which is the same dead-control problem as `control:
       * 'select'`. The header button is this card's control; these two rows are
       * honest status beneath it.
       */
      rows: [
        {
          title: 'Password',
          meta: isEmailAuth
            ? 'Use the button above — changing it signs you out of every device'
            : 'Not used — you sign in through Google',
          value: isEmailAuth ? 'Set' : 'Google-managed',
        },
        {
          title: 'Email address',
          meta: user?.email_verified
            ? 'Verified — used for sign-in and account recovery'
            : 'Unverified — check your inbox for the confirmation link',
          value: user?.email ?? '—',
          tagLabel: user?.email_verified ? 'Verified' : 'Unverified',
          tagColorKey: user?.email_verified ? 'success' : 'warning',
        },
      ],
    },
    {
      kind: 'rows',
      span: 5,
      title: 'Your data',
      subtitle: 'Both of these act immediately · click a row',
      icon: ShieldAlert,
      rows: [
        {
          title: 'Sign out',
          meta: 'Invalidates this session across every device you are signed in on',
          value: 'Sign out',
        },
        {
          title: 'Delete account',
          meta: 'Permanently erases your account and every row of data attached to it',
          value: 'Delete',
          tagLabel: 'Irreversible',
          tagColorKey: 'destructive',
          busy: deleteAccount.isPending,
        },
      ],
      // Both rows act, so every row here is legitimately a button. Sign out is
      // no longer ALSO the header button — one control, one place.
      onRowClick: (i: number) => {
        if (i === 0) logoutAndRedirect(navigate)
        else setDeleteOpen(true)
      },
    },
  ], [user, isEmailAuth, deleteAccount.isPending, navigate])

  return (
    <>
      <ModuleGrid modules={modules} />

      <Dialog
        open={pwOpen}
        onOpenChange={(o) => !o && setPwOpen(false)}
        icon={<KeyRound size={18} />}
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

      <Dialog
        open={deleteOpen}
        onOpenChange={(o) => { if (!o) { setDeleteOpen(false); setConfirmText('') } }}
        icon={<Trash2 size={18} />}
        eyebrow="Danger zone"
        title="Delete your account"
        description="Every account, transaction, log, goal and conversation is erased. This cannot be undone."
      >
        <Form>
          <Warning>There is no export and no recovery. Download anything you need first.</Warning>
          <div>
            <Label>Type DELETE to confirm</Label>
            <Input
              value={confirmText}
              onChange={(e: any) => setConfirmText(e.target.value)}
              placeholder="DELETE"
              aria-label="Type DELETE to confirm account deletion"
              autoFocus
            />
          </div>
          <Actions>
            <Button
              variant="destructive"
              loading={deleteAccount.isPending}
              disabled={confirmText !== 'DELETE'}
              onClick={() => deleteAccount.mutate()}
            >
              Delete my account
            </Button>
            <Button variant="ghost" onClick={() => { setDeleteOpen(false); setConfirmText('') }}>
              Cancel
            </Button>
          </Actions>
        </Form>
      </Dialog>
    </>
  )
}
