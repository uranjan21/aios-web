import { useState } from 'react'
import { Select } from '@ledgr/ui'
import styled from 'styled-components'
import { Row, Section } from '../shared'

// ── Kbd ───────────────────────────────────────────────────────────────────────

const KbdEl = styled.kbd`
  font-size: 12px;
  background: ${({ theme }) => theme.color.muted};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: 4px;
  padding: 2px 8px;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono ?? 'ui-monospace, monospace'};
`

// ── Keyboard shortcuts section ────────────────────────────────────────────────

export function ShortcutsSection() {
  const [shortcutCategory, setShortcutCategory] = useState('all')
  return (
    <Section
      title="Keyboard Shortcuts"
      action={
        <Select
          size="sm"
          fullWidth={false}
          options={[
            { label: 'All Keys', value: 'all' },
            { label: 'Navigation', value: 'nav' },
            { label: 'Actions', value: 'action' },
          ]}
          value={shortcutCategory}
          onChange={(val) => setShortcutCategory(val as string)}
          aria-label="Keyboard shortcut category"
        />
      }
    >
      {[
        ['⌘K', 'Command palette', 'action'], ['⌘L', 'Quick capture', 'action'], ['?', 'Command palette (alt)', 'action'],
        ['⌘⇧T', 'Toggle theme', 'action'], ['G then D', 'Go to Dashboard', 'nav'], ['G then C', 'Go to Chat', 'nav'],
        ['G then F', 'Go to Finance', 'nav'], ['G then H', 'Go to Health', 'nav'], ['G then R', 'Go to Career', 'nav'],
        ['G then B', 'Go to Business', 'nav'], ['G then N', 'Go to Content', 'nav'],
      ]
        .filter(([,, cat]) => shortcutCategory === 'all' || cat === shortcutCategory)
        .map(([key, label]) => (
          <Row key={key} label={label}>
            <KbdEl>{key}</KbdEl>
          </Row>
        ))
      }
    </Section>
  )
}
