import { Card, EmptyState } from '@ledgr/ui'
import styled from 'styled-components'
import { WorkspaceLayout } from '@aios/shared/components/layout/WorkspaceLayout'
import { Users, Route } from 'lucide-react'

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  @media (min-width: 768px) {
    grid-template-columns: 1fr 1fr;
  }
`

export function SaasTabs() {
  return (
    <WorkspaceLayout rail={undefined}>
      <Grid>
      <Card title="Subscribers & Churn" icon={<Users size={16} />}>
        <EmptyState title="No subscriber data yet" description="Connect Stripe to pull in MRR and active subscribers." />
      </Card>
      <Card title="Product Roadmap" icon={<Route size={16} />}>
        <EmptyState title="Roadmap is empty" description="Add features you plan to ship to keep your users informed." />
      </Card>
      </Grid>
    </WorkspaceLayout>
  )
}
