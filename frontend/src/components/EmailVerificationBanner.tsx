import { useState } from 'react'
import styled from 'styled-components'
import { api } from '@/api/client'

const Banner = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 20px;
  background: color-mix(in srgb, var(--color-warning, #c8a449) 12%, transparent);
  border-bottom: 1px solid color-mix(in srgb, var(--color-warning, #c8a449) 30%, transparent);
  font-size: 13px;
  color: var(--color-text);
  flex-wrap: wrap;
`

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
`

const ResendBtn = styled.button`
  background: none;
  border: 1px solid var(--color-border, rgba(0,0,0,0.12));
  border-radius: 8px;
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  color: var(--color-text);
  transition: background 120ms;
  &:hover { background: var(--color-surface-raised, rgba(0,0,0,0.04)); }
  &:disabled { opacity: 0.5; cursor: default; }
`

const DismissBtn = styled.button`
  background: none;
  border: none;
  padding: 4px 8px;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  color: var(--color-muted);
  &:hover { color: var(--color-text); }
`

interface Props {
  email: string
}

export function EmailVerificationBanner({ email }: Props) {
  const [dismissed, setDismissed] = useState(false)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  if (dismissed) return null

  const handleResend = async () => {
    setSending(true)
    try {
      await api.post('/auth/resend-verification')
      setSent(true)
    } catch {
      // ignore — user can try again
    } finally {
      setSending(false)
    }
  }

  return (
    <Banner role="alert">
      <span>
        Please verify your email address (<strong>{email}</strong>) to unlock all features.
        {sent && ' ✓ Verification email sent — check your inbox.'}
      </span>
      <Actions>
        {!sent && (
          <ResendBtn onClick={handleResend} disabled={sending}>
            {sending ? 'Sending…' : 'Resend email'}
          </ResendBtn>
        )}
        <DismissBtn onClick={() => setDismissed(true)} aria-label="Dismiss">×</DismissBtn>
      </Actions>
    </Banner>
  )
}
