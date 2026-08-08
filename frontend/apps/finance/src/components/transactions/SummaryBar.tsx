import { KpiCard } from '@ledgr/ui'
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react'
import { formatCurrency } from '@ct/shared/lib/utils'
import styled from 'styled-components'

/*
 * Page-level KPI row (moved out of the transactions card — it was a card
 * inside a card). No margins: the parent PageStack's gap owns the spacing,
 * and stacking a margin on top of it would double the gap.
 */
/*
 * Grid by default; the scroller lives INSIDE the mobile query, mirroring the
 * module kit's TileScroller. It used to be the other way round — flex +
 * `overflow-x: auto` in the base, grid in the `sm` query — which left
 * `overflow-x: auto` applied at every width. An overflow container CLIPS its
 * children's box-shadow, so the ambient half of `surface.shadow`
 * (`0 14px 34px -26px`) was cut off flat at the card's edge and the KPIs read
 * shadowless next to the module cards, even though the shadow was set.
 * `getComputedStyle` still reports it, so this is invisible to measurement —
 * it has to be looked at.
 */
const KpiGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: ${({ theme }) => `${theme.spacing[3]}`};

  /* MOBILE STRICT: below md the three KPIs stay one compact scroll-snapped row
     rather than a tall loose column. */
  @media ${({ theme }) => theme.media.belowMd} {
    display: flex;
    gap: ${({ theme }) => `${theme.spacing[2]}`};
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    -ms-overflow-style: none;
    /* Room for the ambient shadow the scroller would otherwise clip. */
    padding-bottom: ${({ theme }) => `${theme.spacing[2]}`};

    &::-webkit-scrollbar { display: none; }

    > * {
      flex: 0 0 clamp(168px, 62vw, 190px);
      scroll-snap-align: start;
    }
  }
`

export function SummaryBar({ income, expense }: { income: number; expense: number }) {
  const net = income - expense
  return (
    <KpiGrid>
      <KpiCard label="Income" value={formatCurrency(income)} color="primary" icon={TrendingUp} />
      <KpiCard label="Expenses" value={formatCurrency(expense)} color="rose" icon={TrendingDown} />
      <KpiCard label="Net" value={formatCurrency(net)} color={net >= 0 ? 'foreground' : 'rose'} icon={Wallet} />
    </KpiGrid>
  )
}
