import { Card, EmptyState } from '@ledgr/ui'
import styled from 'styled-components'
import { WorkspaceLayout } from '@/components/layout/WorkspaceLayout'
import { Package, ShoppingCart } from 'lucide-react'

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  @media (min-width: 768px) {
    grid-template-columns: 1fr 1fr;
  }
`

export function EcommerceTabs() {
  return (
    <WorkspaceLayout rail={undefined}>
      <Grid>
      <Card title="Orders & Fulfillment" icon={<ShoppingCart size={16} />}>
        <EmptyState title="No orders yet" description="Connect Shopify to view pending orders and fulfillment status." />
      </Card>
      <Card title="Inventory Management" icon={<Package size={16} />}>
        <EmptyState title="Inventory is empty" description="Add physical products to start tracking stock levels." />
      </Card>
      </Grid>
    </WorkspaceLayout>
  )
}
