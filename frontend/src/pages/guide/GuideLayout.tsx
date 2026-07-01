import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  BookOpen, Rocket, MessageSquare, Bot,
  IndianRupee, Heart, Briefcase, PenLine,
} from 'lucide-react'
import { PageHeader } from '@ledgr/ui'
import { PageContainer, PageContent } from '@/components/layout/PageLayout'
import { Shell, NavRail, GroupBlock, GroupLabel, GroupItems, NavItem, ContentPane } from '@/components/layout/AreaSettingsPage'
import { PageDivider } from '@/components/layout/PageDivider'

const GUIDE_NAV: { label: string; items: { to: string; label: string; icon: typeof BookOpen; end?: boolean }[] }[] = [
  {
    label: 'Getting Started',
    items: [
      { to: '/app/guide', label: 'Overview', icon: BookOpen, end: true },
    ],
  },
  {
    label: 'Core',
    items: [
      { to: '/app/guide/chat', label: 'Chat', icon: MessageSquare },
      { to: '/app/guide/agents', label: 'Agents', icon: Bot },
    ],
  },
  {
    label: 'Areas',
    items: [
      { to: '/app/guide/areas/finance', label: 'Finance', icon: IndianRupee },
      { to: '/app/guide/areas/health', label: 'Health', icon: Heart },
      { to: '/app/guide/areas/career', label: 'Career', icon: Briefcase },
      { to: '/app/guide/areas/business', label: 'Business', icon: Rocket },
      { to: '/app/guide/areas/content', label: 'Content', icon: PenLine },
    ],
  },
]

export function GuideLayout() {
  const location = useLocation()

  return (
    <PageContainer>
      <PageContent>
        <PageHeader icon={<BookOpen />} eyebrow="Help" title="Guide" subtitle="Learn how to use every part of AiOs." />
        <PageDivider />
        <Shell>
          <NavRail aria-label="Guide sections">
            {GUIDE_NAV.map(group => (
              <GroupBlock key={group.label}>
                <GroupLabel>{group.label}</GroupLabel>
                <GroupItems>
                  {group.items.map(item => {
                    const Icon = item.icon
                    const active = item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)
                    return (
                      <NavItem key={item.to} as={NavLink} to={item.to} $active={active}>
                        <Icon size={15} />
                        {item.label}
                      </NavItem>
                    )
                  })}
                </GroupItems>
              </GroupBlock>
            ))}
          </NavRail>
          <ContentPane>
            <Outlet />
          </ContentPane>
        </Shell>
      </PageContent>
    </PageContainer>
  )
}
