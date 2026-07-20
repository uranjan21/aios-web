import { Card, EmptyState } from '@ledgr/ui'
import styled from 'styled-components'
import { WorkspaceLayout } from '@aios/shared/components/layout/WorkspaceLayout'
import { Clock, FileSignature } from 'lucide-react'

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  @media (min-width: 768px) {
    grid-template-columns: 1fr 1fr;
  }
`

export function FreelanceTabs() {
  return (
    <WorkspaceLayout rail={undefined}>
      <Grid>
      <Card title="Hourly Billing" icon={<Clock size={16} />}>
        <EmptyState title="No active timers" description="Log your hours or start a timer for your freelance projects." />
      </Card>
      <Card title="Leads & Contracts" icon={<FileSignature size={16} />}>
        <EmptyState title="No leads found" description="Keep track of potential clients and active contracts here." />
      </Card>
      </Grid>
    </WorkspaceLayout>
  )
}
