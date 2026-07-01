import { ReactNode, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import styled from 'styled-components'
import { PageHeader, Button } from '@ledgr/ui'
import { ArrowLeft, Plus } from 'lucide-react'
import { PageContainer, PageContent } from './PageLayout'
import { PageDivider } from './PageDivider'

export interface SettingsItem {
  key: string
  label: string
  icon: ReactNode
  content: ReactNode
  addLabel?: string
  onAdd?: () => void
}

export interface SettingsGroup {
  label: string
  items: SettingsItem[]
}

interface AreaSettingsPageProps {
  icon: ReactNode
  title: string
  subtitle: string
  backTo: string
  groups: SettingsGroup[]
  eyebrow?: string
}

export const Shell = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 24px;

  @media (max-width: 1023px) {
    flex-direction: column;
  }
`

export const NavRail = styled.nav`
  width: 260px;
  flex-shrink: 0;
  background: ${({ theme }) => theme.color.card};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: 14px 12px;
  display: flex;
  flex-direction: column;
  gap: 18px;

  @media (min-width: 1024px) {
    position: sticky;
    top: 24px;
  }

  @media (max-width: 1023px) {
    width: 100%;
  }
`

export const GroupBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

export const GroupLabel = styled.div`
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.color.mutedForeground};
  padding: 0 10px 6px;
`

export const GroupItems = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-left: 12px;
  padding-left: 9px;
  border-left: 1px solid ${({ theme }) => theme.color.border};
`

export const NavItem = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  text-align: left;
  padding: 8px 10px;
  border-radius: ${({ theme }) => theme.radii.md};
  border: none;
  background: ${({ $active, theme }) => ($active ? `${theme.color.accent}14` : 'transparent')};
  color: ${({ $active, theme }) => ($active ? theme.color.accent : theme.color.foreground)};
  font-size: 13px;
  font-weight: ${({ $active }) => ($active ? 600 : 500)};
  cursor: pointer;
  transition: background 120ms, color 120ms;

  &:hover {
    background: ${({ theme, $active }) => ($active ? `${theme.color.accent}1f` : theme.color.muted)};
  }

  svg {
    flex-shrink: 0;
    color: ${({ $active, theme }) => ($active ? theme.color.accent : theme.color.mutedForeground)};
  }
`

export const ContentPane = styled.div`
  flex: 1;
  min-width: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`

const ContentHeader = styled.div`
  display: flex;
  justify-content: flex-end;
`

export function AreaSettingsPage({ icon, title, subtitle, backTo, groups, eyebrow = 'Settings' }: AreaSettingsPageProps) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const allKeys = groups.flatMap(g => g.items.map(i => i.key))
  const initialKey = searchParams.get('section')
  const [activeKey, setActiveKey] = useState(
    initialKey && allKeys.includes(initialKey) ? initialKey : (groups[0]?.items[0]?.key ?? '')
  )

  const activeItem = groups.flatMap(g => g.items).find(i => i.key === activeKey)

  return (
    <PageContainer>
      <PageContent>
        <PageHeader
          icon={icon}
          eyebrow={eyebrow}
          title={title}
          subtitle={subtitle}
          actions={
            <Button variant="ghost" size="sm" onClick={() => navigate(backTo)}>
              <ArrowLeft size={14} style={{ marginRight: 6 }} /> Back
            </Button>
          }
        />
        <PageDivider />
        <Shell>
          <NavRail aria-label="Settings sections">
            {groups.map(group => (
              <GroupBlock key={group.label}>
                <GroupLabel>{group.label}</GroupLabel>
                <GroupItems>
                  {group.items.map(item => (
                    <NavItem
                      key={item.key}
                      type="button"
                      $active={item.key === activeKey}
                      onClick={() => setActiveKey(item.key)}
                    >
                      {item.icon}
                      {item.label}
                    </NavItem>
                  ))}
                </GroupItems>
              </GroupBlock>
            ))}
          </NavRail>
          <ContentPane>
            {activeItem?.onAdd && (
              <ContentHeader>
                <Button variant="primary" size="sm" onClick={activeItem.onAdd}>
                  <Plus size={12} style={{ marginRight: 4 }} /> {activeItem.addLabel ?? `Add ${activeItem.label}`}
                </Button>
              </ContentHeader>
            )}
            {activeItem?.content}
          </ContentPane>
        </Shell>
      </PageContent>
    </PageContainer>
  )
}
