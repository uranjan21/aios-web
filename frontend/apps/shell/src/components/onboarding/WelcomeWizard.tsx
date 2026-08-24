/**
 * First-run flow.
 *
 * What this replaced (2026-08-23): four slides of marketing copy with no
 * actions, whose "finish" handler contained a COMMENTED-OUT API call and wrote
 * `localStorage.ct_onboarded` instead. So it reappeared on every new device,
 * browser and incognito window; nothing about activation was ever recorded
 * server-side; and a new user arrived at an empty dashboard having been told
 * the product unifies three areas, without having touched any of them.
 *
 * The rule here: every step either teaches something the user cannot infer from
 * an empty dashboard, or performs a real action. A step that only asserts value
 * is a slide, and slides belong on the landing page.
 */
import { useMemo, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import {
  ArrowRight, Check, Link2, PenLine, Sparkles, type LucideIcon,
} from 'lucide-react'
import { Button, textRole } from '@ledgr/ui'

import { api } from '@ct/shared/api/client'
import { useAuthStore } from '@ct/shared/stores/authStore'

const Overlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: ${({ theme }) => theme.color.overlay};
  backdrop-filter: ${({ theme }) => theme.glass.thin};
  -webkit-backdrop-filter: ${({ theme }) => theme.glass.thin};
  z-index: ${({ theme }) => theme.zIndex.overlay};
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing[4]};
`

const Card = styled(motion.div)`
  background: ${({ theme }) => theme.color.card};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  box-shadow: ${({ theme }) => theme.elevation[4]};
  width: 100%;
  max-width: 520px;
  padding: ${({ theme }) => `${theme.spacing[6]} ${theme.spacing[6]} ${theme.spacing[5]}`};
`

const Dots = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[1]};
  margin-bottom: ${({ theme }) => theme.spacing[5]};
`

const Dot = styled.div<{ $state: 'done' | 'active' | 'todo' }>`
  height: 3px;
  flex: 1;
  border-radius: ${({ theme }) => theme.radii.xs};
  background: ${({ theme, $state }) =>
    $state === 'todo' ? theme.color.muted : theme.color.accent};
  opacity: ${({ $state }) => ($state === 'active' ? 1 : $state === 'done' ? 0.55 : 1)};
  transition: opacity 200ms, background 200ms;
`

const IconChip = styled.div`
  width: 40px;
  height: 40px;
  border-radius: ${({ theme }) => theme.radii.sm};
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => theme.color.muted};
  color: ${({ theme }) => theme.color.accent};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`

const Title = styled.h2`
  ${textRole('title-m')};
  margin: 0 0 ${({ theme }) => theme.spacing[2]};
  color: ${({ theme }) => theme.color.foreground};
`

const Body = styled.p`
  ${textRole('body-m')};
  color: ${({ theme }) => theme.color.mutedForeground};
  margin: 0;
  line-height: ${({ theme }) => theme.typography.lineHeight.relaxed};
`

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  margin-top: ${({ theme }) => theme.spacing[6]};
`

const Skip = styled.button`
  ${textRole('body-s')};
  background: none;
  border: none;
  color: ${({ theme }) => theme.color.mutedForeground};
  cursor: pointer;
  padding: ${({ theme }) => theme.spacing[2]};
  margin-left: auto;

  &:hover { color: ${({ theme }) => theme.color.foreground}; }
`

interface Step {
  id: string
  icon: LucideIcon
  title: string
  body: string
  /** Label for the action button. */
  cta: string
  /** Where the CTA sends them. Absent, the CTA just advances. */
  to?: string
}

export function WelcomeWizard({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0)
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)

  /*
   * Records the activation event. If it fails the flow still closes — a network
   * blip must not trap someone behind a modal on their first visit — but the
   * local user object is only updated on success, so the next `/auth/me` will
   * legitimately reopen it rather than leaving the account marked done.
   */
  const finish = useMutation({
    mutationFn: () => api.post('/auth/me/onboarded').then((r) => r.data),
    onSuccess: (data) => setUser(data),
    onError: () => toast.error('Could not save your setup — it will ask again next time'),
    onSettled: () => onComplete(),
  })

  const steps = useMemo<Step[]>(() => [
    {
      id: 'welcome',
      icon: Sparkles,
      title: `Welcome, ${(user?.name ?? '').trim().split(/\s+/)[0] || 'there'}`,
      body:
        'Control Tower is not three apps in one. It watches money, body and work together, and tells you what one is doing to the others — the thing a budget app or a fitness tracker cannot see on its own. That takes a few weeks of data, so the fastest thing you can do today is give it something to work with.',
      cta: 'Show me',
    },
    {
      id: 'connect',
      icon: Link2,
      title: 'Connect Gmail and stop typing transactions',
      body:
        'Control Tower reads bank and UPI alert emails and queues the transactions for you to approve. Nothing is filed without your say-so, and it only ever reads mail from the senders you would expect. This is the single highest-value thing to set up.',
      cta: 'Connect Gmail',
      to: '/app/settings/connections',
    },
    {
      id: 'log',
      icon: PenLine,
      title: 'Log one thing',
      body:
        'Press ⌘L anywhere to capture a spend, a workout or a note. Patterns need roughly three weeks across two areas before they mean anything, so the first entry is genuinely the hard one.',
      cta: 'Open my dashboard',
    },
  ], [user?.name])

  const current = steps[step]
  const Icon = current.icon
  const isLast = step === steps.length - 1

  const advance = () => {
    if (current.to) navigate(current.to)
    if (isLast || current.to) finish.mutate()
    else setStep((s) => s + 1)
  }

  return (
    <AnimatePresence>
      <Overlay initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <Card
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <Dots>
            {steps.map((s, i) => (
              <Dot key={s.id} $state={i < step ? 'done' : i === step ? 'active' : 'todo'} />
            ))}
          </Dots>

          <AnimatePresence mode="wait">
            <motion.div
              key={current.id}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.18 }}
            >
              <IconChip><Icon size={20} /></IconChip>
              <Title>{current.title}</Title>
              <Body>{current.body}</Body>
            </motion.div>
          </AnimatePresence>

          <Actions>
            <Button onClick={advance} loading={finish.isPending}>
              {current.cta}
              {isLast ? <Check size={15} /> : <ArrowRight size={15} />}
            </Button>
            {/* Always skippable. A first-run modal that cannot be dismissed is a
                trap, and someone who already knows the product should not have
                to click through it. Skipping still records activation, so it
                does not reappear on their next device. */}
            <Skip type="button" onClick={() => finish.mutate()}>
              {isLast ? 'Close' : 'Skip setup'}
            </Skip>
          </Actions>
        </Card>
      </Overlay>
    </AnimatePresence>
  )
}
