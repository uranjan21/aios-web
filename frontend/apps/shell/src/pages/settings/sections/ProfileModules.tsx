/**
 * Settings → Profile.
 *
 * Replaces the old `general` tab, which was a grab-bag: the display-name form,
 * the Gmail connection list and the sign-out + delete-account block all shared
 * one page. Connections became its own tab and the account-destroying actions
 * moved to Security, so what is left here is identity and nothing else.
 *
 * Every field below is a real column on the user — `name` and `picture_url` are
 * the two `PATCH /auth/profile` accepts from this tab, and the rest are facts
 * the server owns and this page only reports.
 */
import { useEffect, useMemo, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import styled from 'styled-components'
import { UserCircle } from 'lucide-react'
import { Button, Dialog, Input } from '@ledgr/ui'
import { api } from '@ct/shared/api/client'
import { useAuthStore } from '@ct/shared/stores/authStore'
import { ModuleGrid, type ModuleSpec } from '@ct/shared/components/modules'
import { FieldError, useFieldErrors } from '@ct/shared/components/forms/fieldErrors'

const Form = styled.form`
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

export function ProfileModules() {
  const { user, setUser } = useAuthStore()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [picture, setPicture] = useState('')
  const f = useFieldErrors<'name' | 'picture_url'>('profile')

  /*
   * `@ledgr/ui` Dialog only ever fires onOpenChange(false), so the prefill has
   * to hang off the open flag rather than an onOpenChange(true) branch that
   * would never run.
   */
  useEffect(() => {
    if (!open) return
    setName(user?.name ?? '')
    setPicture(user?.picture_url ?? '')
    f.reset()
  }, [open, user?.name, user?.picture_url, f])

  const save = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      api.patch('/auth/profile', payload).then(r => r.data),
    onSuccess: (data) => {
      setUser(data)
      setOpen(false)
      toast.success('Profile updated')
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Failed to update profile'),
  })

  /*
   * Both rules mirror the server: `PATCH /auth/profile` 400s on a name that is
   * empty after stripping, and its `picture_url` validator rejects anything
   * non-empty that is not an http/https URL under 2048 characters. An empty
   * avatar is legal — it clears the column.
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedName = name.trim()
    const url = picture.trim()
    const ok = f.submit({
      name: trimmedName ? undefined : 'Enter the name the app should call you.',
      picture_url: url === '' || (/^https?:\/\/\S{1,2048}$/.test(url))
        ? undefined
        : 'Enter a full http:// or https:// image URL, or leave this blank.',
    })
    if (ok) save.mutate({ name: trimmedName, picture_url: url })
  }

  /*
   * ONE card, and every row on it opens the editor.
   *
   * There used to be a `tiles` row above this listing display name, email,
   * sign-in method and role. Every one of those four was stated again
   * immediately below or on the Security tab, and a tile is not clickable —
   * so it was four cards of text that could not be acted on. Email, sign-in
   * method and role are Security's subject and are only stated there now.
   *
   * The two fields this tab actually owns are `name` and `picture_url` — the
   * only two `PATCH /auth/profile` accepts here — so they are the two rows,
   * and clicking either opens the dialog that edits them.
   */
  const modules = useMemo<ModuleSpec[]>(() => [
    {
      kind: 'rows',
      span: 12,
      title: 'Identity',
      subtitle: 'What the app calls you, and the picture it shows · click a row to edit',
      icon: UserCircle,
      action: 'Edit profile',
      onAction: () => setOpen(true),
      onRowClick: () => setOpen(true),
      rows: [
        {
          title: 'Display name',
          meta: 'Used by the assistant, the greeting and every mention of you',
          value: user?.name || 'Not set',
        },
        {
          title: 'Avatar',
          meta: user?.picture_url
            ? 'A public image URL — shown in the top bar and sidebar'
            : 'No image set — your initials are used instead',
          value: user?.picture_url ? 'Set' : 'Initials',
          tagLabel: user?.picture_url ? 'Image' : undefined,
          tagColorKey: 'success',
        },
      ],
    },
  ], [user])

  return (
    <>
      <ModuleGrid modules={modules} />

      <Dialog
        open={open}
        onOpenChange={(o) => !o && setOpen(false)}
        icon={<UserCircle size={18} />}
        eyebrow="Profile"
        title="Edit profile"
        description="Your name and avatar. Your email address and sign-in method are managed in Security."
      >
        <Form noValidate onSubmit={handleSubmit}>
          <div>
            <Label htmlFor="profile-name-input">Display name</Label>
            <Input
              id="profile-name-input"
              value={name}
              {...f.fieldProps('name')}
              onChange={(e: any) => { f.clearField('name'); setName(e.target.value) }}
              placeholder="Your name"
              maxLength={80}
              autoFocus
            />
            <FieldError id={f.errorId('name')}>{f.errors.name}</FieldError>
          </div>
          <div>
            <Label htmlFor="profile-picture-input">Avatar URL (optional)</Label>
            <Input
              id="profile-picture-input"
              value={picture}
              {...f.fieldProps('picture_url')}
              onChange={(e: any) => { f.clearField('picture_url'); setPicture(e.target.value) }}
              placeholder="https://…"
            />
            <FieldError id={f.errorId('picture_url')}>{f.errors.picture_url}</FieldError>
          </div>
          <Actions>
            <Button type="submit" variant="primary" loading={save.isPending}>
              Save changes
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          </Actions>
        </Form>
      </Dialog>
    </>
  )
}
