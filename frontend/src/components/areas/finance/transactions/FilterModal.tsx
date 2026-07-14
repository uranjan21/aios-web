import { Button, Input, Select, Sheet } from '@ledgr/ui'
import dayjs, { Dayjs } from 'dayjs'
import styled from 'styled-components'

const FiltersGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 12px;
`

const FilterLabel = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.color.mutedForeground};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 500;
`

const FilterRow = styled.div`
  display: flex;
  gap: 8px;
`

const FilterActions = styled.div`
  padding-top: 8px;
  display: flex;
  gap: 8px;
`

export function FilterModal({
  open,
  onClose,
  accounts,
  categories,
  filterKind,
  setFilterKind,
  filterAccount,
  setFilterAccount,
  filterCategory,
  setFilterCategory,
  filterTag,
  setFilterTag,
  filterMin,
  setFilterMin,
  filterMax,
  setFilterMax,
  filterRange,
  setFilterRange,
  filtersActive,
  clearFilters }: {
  open: boolean
  onClose: () => void
  accounts: any[]
  categories: any[]
  filterKind: string
  setFilterKind: (k: string) => void
  filterAccount: string | undefined
  setFilterAccount: (a: string | undefined) => void
  filterCategory: string | undefined
  setFilterCategory: (c: string | undefined) => void
  filterTag: string
  setFilterTag: (t: string) => void
  filterMin: number | null
  setFilterMin: (n: number | null) => void
  filterMax: number | null
  setFilterMax: (n: number | null) => void
  filterRange: [Dayjs, Dayjs] | null
  setFilterRange: (r: [Dayjs, Dayjs] | null) => void
  filtersActive: boolean
  clearFilters: () => void
}) {
  return (
    <Sheet
      open={open}
      onOpenChange={(v) => { if(!v) onClose() }}
      title="Advanced Filters"
      side="right"
    >
      <FiltersGroup>
        <FilterLabel>Type</FilterLabel>
        <Select
          size="sm"
          fullWidth
          options={[{ label: 'All', value: 'all' }, { label: 'Expense', value: 'expense' }, { label: 'Income', value: 'income' }, { label: 'Transfer', value: 'transfer' }]}
          value={filterKind}
          onChange={(v: string | number) => setFilterKind(String(v))}
          aria-label="Filter by type"
        />
        <FilterLabel>Account</FilterLabel>
        <Select
          id="filter-account"
          size="sm"
          placeholder="Select Account"
          style={{ width: '100%' }}
          value={filterAccount}
          onChange={(v: string | number) => setFilterAccount(String(v))}
          options={(accounts ?? []).map((a: any) => ({ label: a.name, value: a.id }))}
          aria-label="Filter by account"
        />
        <FilterLabel>Category</FilterLabel>
        <Select
          id="filter-category"
          size="sm"
          placeholder="Select Category"
          style={{ width: '100%' }}
          value={filterCategory}
          onChange={(v: string | number) => setFilterCategory(String(v))}
          options={(categories ?? []).map((c: any) => ({ label: c.name, value: c.name }))}
          aria-label="Filter by category"
        />
        <FilterLabel>Tag</FilterLabel>
        <Input id="filter-tag" size="sm" placeholder="Enter tag name" value={filterTag} onChange={e => setFilterTag(e.target.value)} aria-label="Filter by tag name" />
        <FilterLabel>Amount Range</FilterLabel>
        <FilterRow>
          <Input type="number" size="sm" placeholder="Min ₹" min="0" step="0.01" style={{ width: '100%' }} value={filterMin ?? ''} onChange={e => setFilterMin(e.target.value ? Number(e.target.value) : null)} aria-label="Minimum amount" />
          <Input type="number" size="sm" placeholder="Max ₹" min="0" step="0.01" style={{ width: '100%' }} value={filterMax ?? ''} onChange={e => setFilterMax(e.target.value ? Number(e.target.value) : null)} aria-label="Maximum amount" />
        </FilterRow>
        <FilterLabel>Date Range</FilterLabel>
        <FilterRow>
          <Input type="date" size="sm" style={{ width: '100%' }} value={filterRange?.[0] ? filterRange[0].format('YYYY-MM-DD') : ''} onChange={e => setFilterRange(e.target.value ? [dayjs(e.target.value), filterRange?.[1] || dayjs(e.target.value)] : null)} aria-label="Start date" />
          <Input type="date" size="sm" style={{ width: '100%' }} value={filterRange?.[1] ? filterRange[1].format('YYYY-MM-DD') : ''} onChange={e => setFilterRange(e.target.value ? [filterRange?.[0] || dayjs(e.target.value), dayjs(e.target.value)] : null)} aria-label="End date" />
        </FilterRow>
        <FilterActions>
          <Button variant="primary" size="sm" style={{ width: '100%' }} onClick={onClose}>Apply Filters</Button>
          {filtersActive && (
            <Button size="sm" variant="ghost" onClick={() => { clearFilters(); onClose(); }} style={{ fontSize: '11px', width: '100%', color: 'var(--kpi-red)' }}>Clear all</Button>
          )}
        </FilterActions>
      </FiltersGroup>
    </Sheet>
  )
}
