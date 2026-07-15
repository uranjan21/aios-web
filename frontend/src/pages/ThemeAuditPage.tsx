/**
 * TEMPORARY — throwaway audit surface. Delete before merge.
 * Renders real @ledgr/ui primitives so light/dark can be inspected without auth.
 * Route: /theme-audit
 */
import { useUIStore } from '@/stores/uiStore'
import styled from 'styled-components'
import {
  Button, Card, Input, Badge, Separator, Textarea,
  KpiCard, EmptyState, StatusBadge, SegmentedControl, PageHeader,
} from '@ledgr/ui'
import { Wallet, Inbox, Activity, CheckCircle, AlertCircle, XCircle } from 'lucide-react'
import { StatusPill, IconBadge } from '@/components/lumina'

const Root = styled.div`
  min-height: 100dvh;
  background: ${({ theme }) => theme.color.background};
  color: ${({ theme }) => theme.color.foreground};
  padding: 24px;
`
const Bar = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  align-items: center;
`
const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
`
const Probe = styled.h2`
  /* no font-family — inherits whatever GlobalStyles decides */
`

export function ThemeAuditPage() {
  const theme = useUIStore(s => s.theme)
  const setTheme = useUIStore(s => s.setTheme)

  return (
    <Root>
      <Bar>
        <Button size="sm" variant={theme === 'light' ? 'primary' : 'outline'} onClick={() => setTheme('light')}>Light</Button>
        <Button size="sm" variant={theme === 'dark' ? 'primary' : 'outline'} onClick={() => setTheme('dark')}>Dark</Button>
        <span id="mode" data-mode={theme}>mode: {theme}</span>
      </Bar>

      <PageHeader icon={<Wallet size={18} />} eyebrow="Audit" title="PageHeader h1 title" subtitle="Subtitle line" />

      <Probe id="probe-h2">Bare h2 — font probe</Probe>

      <Separator />

      <Grid>
        <Card icon={<Wallet size={16} />} title="Card title (h2)" subtitle="Card subtitle">
          <p>Body copy inside a card.</p>
        </Card>
        <KpiCard label="Current Weight" value="72.4 kg" icon={Activity} sub="Latest logged" />
        <Card title="Inputs">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Input placeholder="you@example.com" fullWidth />
            <Textarea placeholder="Notes" fullWidth />
          </div>
        </Card>
        <Card title="Buttons">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button size="sm" variant="primary">Primary</Button>
            <Button size="sm" variant="outline">Outline</Button>
            <Button size="sm" variant="ghost">Ghost</Button>
          </div>
        </Card>
        <Card title="Badges">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Badge>Default</Badge>
            <StatusBadge status="success" label="Active" />
            <StatusBadge status="warning" label="Pending" />
          </div>
        </Card>
        <Card title="lumina · StatusPill (retokenized)">
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {(['neutral', 'primary', 'emerald', 'blue', 'amber', 'red', 'accent', 'purple', 'indigo'] as const).map(t => (
              <StatusPill key={t} label={t} tone={t} />
            ))}
          </div>
        </Card>
        <Card title="lumina · IconBadge (retokenized)">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <IconBadge icon={CheckCircle} color="primary" size="md" />
            <IconBadge icon={AlertCircle} color="accent" size="md" />
            <IconBadge icon={XCircle} color="muted" size="md" />
            <IconBadge icon={Activity} color="emerald" size="md" />
            <IconBadge icon={Activity} color="blue" size="md" />
            <IconBadge icon={Activity} color="red" size="md" />
          </div>
        </Card>
        <Card title="SegmentedControl">
          <SegmentedControl
            size="sm"
            value="all"
            onChange={() => {}}
            options={[{ label: 'All', value: 'all' }, { label: 'Over', value: 'over' }]}
          />
        </Card>
      </Grid>

      <Card title="EmptyState">
        <EmptyState icon={<Inbox size={22} />} title="Nothing here yet" description="Log something to get started." />
      </Card>
    </Root>
  )
}
