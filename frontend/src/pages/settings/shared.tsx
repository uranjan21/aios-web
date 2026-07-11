import styled from 'styled-components'
import { Palette, Activity, Sparkles, Keyboard, User, CreditCard, Lock, Zap, BookOpen } from 'lucide-react'
import { Card as GlassCard } from '@ledgr/ui'

// ── Row ───────────────────────────────────────────────────────────────────────

export const RowRoot = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 20px;
`

export const RowLabel = styled.span`
  font-size: 13px;
  font-weight: 500;
  color: ${({ theme }) => theme.color.foreground};
`

const RowActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

export function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <RowRoot>
      <RowLabel>{label}</RowLabel>
      <RowActions>{children}</RowActions>
    </RowRoot>
  )
}

const SECTION_META: Record<string, { icon: React.ReactNode; subtitle: string }> = {
  Appearance: { icon: <Palette size={16} />, subtitle: 'Theme, density, and visual preferences' },
  'System Status': { icon: <Activity size={16} />, subtitle: 'Live state of backend, sync, and integrations' },
  'AI Usage': { icon: <Sparkles size={16} />, subtitle: 'AI budget status and reset window' },
  'Keyboard Shortcuts': { icon: <Keyboard size={16} />, subtitle: 'Quick reference for in-app shortcuts' },
  Billing: { icon: <CreditCard size={16} />, subtitle: 'Manage subscription and billing' },
  Profile: { icon: <User size={16} />, subtitle: 'Your name and avatar' },
  Security: { icon: <Lock size={16} />, subtitle: 'Change your password' },
  Account: { icon: <User size={16} />, subtitle: 'Sign-out and account-level controls' },
  Automations: { icon: <Zap size={16} />, subtitle: 'Curated automation rules' },
  'Knowledge Base': { icon: <BookOpen size={16} />, subtitle: 'Your external notes, pulled in for chat and agents' },
}

export function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  const meta = SECTION_META[title]
  return (
    <GlassCard
      variant="glass"
      title={title}
      subtitle={meta?.subtitle}
      icon={meta?.icon}
      action={action}
      noPadding
    >
      {children}
    </GlassCard>
  )
}

// ── Shared form input ─────────────────────────────────────────────────────────

export const FormInput = styled.input`
  font-size: 13px;
  padding: 7px 10px;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => theme.color.border};
  background: ${({ theme }) => theme.color.background};
  color: ${({ theme }) => theme.color.foreground};
  outline: none;
  min-width: 200px;
  transition: border-color 120ms;
  &:focus { border-color: ${({ theme }) => theme.color.accent}; }
  &::placeholder { color: ${({ theme }) => theme.color.mutedForeground}; }
`
