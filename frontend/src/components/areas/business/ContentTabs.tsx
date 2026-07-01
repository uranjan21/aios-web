import { Card, EmptyState } from '@ledgr/ui'
import styled from 'styled-components'
import { WorkspaceLayout } from '@/components/layout/WorkspaceLayout'
import { Megaphone, HandCoins } from 'lucide-react'

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  @media (min-width: 768px) {
    grid-template-columns: 1fr 1fr;
  }
`

export function ContentTabs() {
  return (
    <WorkspaceLayout rail={undefined}>
      <Grid>
      <Card title="Sponsors & Affiliates" icon={<HandCoins size={16} />}>
        <EmptyState title="No active sponsors" description="Track your incoming sponsor deals and affiliate links here." />
      </Card>
      <Card title="Ad Revenue & Platforms" icon={<Megaphone size={16} />}>
        <EmptyState title="No revenue data" description="Connect your YouTube or Twitch accounts to track ad revenue." />
      </Card>
      </Grid>
    </WorkspaceLayout>
  )
}
