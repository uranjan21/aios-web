/**
 * Canonical data Table for the whole app.
 *
 * One look for every table: the @ledgr/ui `DataTable` engine rendered inside the
 * canonical `Card` surface, using the Card's own `title`/`action` header so a
 * table header is identical to every other card header. Replaces the per-area
 * `TableStyles.ts` (`TableContainer` + `TableHeader`) wrappers so headers,
 * padding, borders and row density are identical across all domains.
 *
 * Simple table:
 *   <Table title="Recurring Bills" columns={cols} rows={rows} getRowKey={r => r.id}
 *          footer={<><span>Total</span><span>₹12,300</span></>} />
 *
 * Table with extra content between header and rows (forms, banners) — compose
 * directly on the Card surface and reuse <TableFooter>:
 *   <Card title="Limits by Category" action={<Button…/>}>
 *     {form}
 *     <DataTable … />
 *     <TableFooter><span>Total</span><span>₹…</span></TableFooter>
 *   </Card>
 */
import type { ReactNode } from 'react'
import styled from 'styled-components'
import { Card, DataTable } from '@ledgr/ui'
import type { DataTableProps } from '@ledgr/ui'

const Surface = styled(Card)`
  overflow-x: auto;
  width: 100%;
`

/** Justified footer row (e.g. totals) — shared so every table totals row matches. */
export const TableFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid ${({ theme }) => theme.color.border};
  font-weight: 500;
  font-size: 13px;
  color: ${({ theme }) => theme.color.foreground};
`

export interface TableProps<Row> extends DataTableProps<Row> {
  /** Card-header title (rendered via the Card's native header). */
  title?: string
  /** Optional right-aligned header action (button, link, filter). */
  action?: ReactNode
  /** Optional footer content laid out as a justified row (e.g. totals). */
  footer?: ReactNode
}

export function Table<Row>({ title, action, footer, className, ...dataTable }: TableProps<Row>) {
  return (
    <Surface title={title} action={action} className={className}>
      <DataTable {...(dataTable as DataTableProps<Row>)} />
      {footer && <TableFooter>{footer}</TableFooter>}
    </Surface>
  )
}
