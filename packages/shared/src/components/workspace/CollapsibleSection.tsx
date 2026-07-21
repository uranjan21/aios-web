import styled from 'styled-components'
import { useUIStore } from '@aios/shared/stores/uiStore'

const Section = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => `${theme.spacing[2]}`};
`

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: ${({ theme }) => `${theme.spacing[1.5]}`};
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
  margin-bottom: ${({ theme }) => `${theme.spacing[0.5]}`};
  cursor: pointer;
`

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => `${theme.spacing[1.5]}`};
`

const Title = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: 600;
  color: ${({ theme }) => theme.color.foreground};
  text-transform: uppercase;
  letter-spacing: 0.06em;
`

const Count = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.color.mutedForeground};
`

const CollapseBtn = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  color: ${({ theme }) => theme.color.mutedForeground};
  display: inline-flex;
  align-items: center;
  padding: ${({ theme }) => `0 ${theme.spacing[1]}`};
  transition: color 120ms;
  &:hover { color: ${({ theme }) => theme.color.foreground}; }
`

/**
 * Collapsible group section for workspace list pages (Projects / Sprints /
 * Tasks). Collapse state persists per sectionId via uiStore.
 */
export function CollapsibleSection({ sectionId, label, count, children }: {
  sectionId: string
  label: string
  count: string
  children: React.ReactNode
}) {
  const collapsedSections = useUIStore(s => s.collapsedSections)
  const toggleSection = useUIStore(s => s.toggleSectionCollapsed)
  const open = !collapsedSections[sectionId]

  return (
    <Section>
      <Header onClick={() => toggleSection(sectionId)}>
        <HeaderLeft>
          <CollapseBtn aria-label={open ? 'Collapse' : 'Expand'} aria-expanded={open}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {open
                ? <path d="M2 4l4 4 4-4" />
                : <path d="M4 2l4 4-4 4" />}
            </svg>
          </CollapseBtn>
          <Title>{label}</Title>
        </HeaderLeft>
        <Count>{count}</Count>
      </Header>
      {open && children}
    </Section>
  )
}
