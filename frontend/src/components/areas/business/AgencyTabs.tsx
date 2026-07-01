import { Card, EmptyState } from '@ledgr/ui'
import styled from 'styled-components'
import { WorkspaceLayout } from '@/components/layout/WorkspaceLayout'
import { Briefcase, FileText } from 'lucide-react'

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  @media (min-width: 768px) {
    grid-template-columns: 1fr 1fr;
  }
`

export function AgencyTabs() {
  return (
    <WorkspaceLayout rail={undefined}>
      <Grid>
      <Card title="Active Clients & Projects" icon={<Briefcase size={16} />}>
        <EmptyState title="No active clients" description="Add your first client to start tracking their projects." />
      </Card>
      <Card title="Proposals & Invoices" icon={<FileText size={16} />}>
        <EmptyState title="No invoices sent" description="Draft a proposal or generate an invoice to get paid." />
      </Card>
      </Grid>
    </WorkspaceLayout>
  )
}
