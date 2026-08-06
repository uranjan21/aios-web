/**
 * Composed skeletons — the shapes the app actually loads into.
 *
 * A single grey rectangle is not a loading state, it is a placeholder for one.
 * It tells the user nothing about what is arriving and it jumps when the real
 * content replaces it. Each component here traces the geometry of a real
 * surface — a card header, a table, a KPI row — so the page holds its shape
 * from first paint and the swap is quiet.
 *
 * These are pure composition over `Skeleton`. They own no colour and no
 * animation; change those in `Skeleton.tsx` and every shape follows.
 */
import styled from 'styled-components';
import { Skeleton } from './Skeleton';

const Stack = styled.div<{ $gap?: string }>`
  display: flex;
  flex-direction: column;
  gap: ${({ theme, $gap }) => $gap ?? theme.spacing[3]};
  width: 100%;
`;

const Row = styled.div<{ $gap?: string; $align?: string }>`
  display: flex;
  align-items: ${({ $align }) => $align ?? 'center'};
  gap: ${({ theme, $gap }) => $gap ?? theme.spacing[3]};
  width: 100%;
  min-width: 0;
`;

const Surface = styled.div`
  background: ${({ theme }) => theme.surface.card};
  border: 1px solid ${({ theme }) => theme.surface.border};
  border-radius: ${({ theme }) => theme.radii.md};
  box-shadow: ${({ theme }) => theme.surface.shadow};
  overflow: hidden;
  width: 100%;
`;

const Pad = styled.div`
  padding: ${({ theme }) => `${theme.spacing[4]} ${theme.spacing[5]}`};
`;

const Divider = styled.div`
  height: 1px;
  background: ${({ theme }) => theme.color.border};
  width: 100%;
`;

/* ─────────────────────────── text ─────────────────────────── */

export interface SkeletonTextProps {
  /** Number of lines. */
  lines?: number;
  /** Width of the final line — a paragraph rarely ends flush. */
  lastLineWidth?: string;
  height?: number;
}

export function SkeletonText({ lines = 3, lastLineWidth = '62%', height = 12 }: SkeletonTextProps) {
  return (
    <Stack $gap="8px">
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton
          key={i}
          shape="text"
          height={height}
          width={i === lines - 1 ? lastLineWidth : '100%'}
        />
      ))}
    </Stack>
  );
}

/* ─────────────────────────── card ─────────────────────────── */

export interface SkeletonCardProps {
  /** Draw the icon + title + subtitle header block. */
  header?: boolean;
  /** Height of the body area below the header. */
  bodyHeight?: number;
  /** Render the body as text lines instead of one block. */
  bodyLines?: number;
}

export function SkeletonCard({ header = true, bodyHeight = 140, bodyLines }: SkeletonCardProps) {
  return (
    <Surface>
      {header && (
        <>
          <Pad>
            <Row>
              <Skeleton shape="chip" width={32} height={32} />
              <Stack $gap="7px">
                <Skeleton shape="text" height={13} width="42%" />
                <Skeleton shape="text" height={10} width="26%" />
              </Stack>
            </Row>
          </Pad>
          <Divider />
        </>
      )}
      <Pad>
        {bodyLines ? <SkeletonText lines={bodyLines} /> : <Skeleton height={bodyHeight} />}
      </Pad>
    </Surface>
  );
}

/* ─────────────────────────── list ─────────────────────────── */

export interface SkeletonListProps {
  rows?: number;
  /** Draw a leading avatar/icon square on each row. */
  leading?: boolean;
  /** Draw a trailing value on each row. */
  trailing?: boolean;
}

const ListRow = styled(Row)`
  padding: ${({ theme }) => `${theme.spacing[3]} 0`};

  & + & {
    border-top: 1px solid ${({ theme }) => theme.color.border};
  }
`;

/*
 * Row widths are staggered rather than uniform. A column of identical bars
 * reads as a loading bar; staggered ones read as a list of different things,
 * which is what is actually arriving.
 */
const LABEL_WIDTHS = ['58%', '44%', '66%', '38%', '52%', '61%', '47%'];

export function SkeletonList({ rows = 5, leading = true, trailing = true }: SkeletonListProps) {
  return (
    <Stack $gap="0">
      {Array.from({ length: rows }, (_, i) => (
        <ListRow key={i}>
          {leading && <Skeleton shape="chip" width={30} height={30} />}
          <Stack $gap="7px">
            <Skeleton shape="text" height={12} width={LABEL_WIDTHS[i % LABEL_WIDTHS.length]} />
            <Skeleton shape="text" height={9} width="28%" />
          </Stack>
          {trailing && <Skeleton shape="text" height={12} width={54} />}
        </ListRow>
      ))}
    </Stack>
  );
}

/* ─────────────────────────── table ─────────────────────────── */

export interface SkeletonTableProps {
  rows?: number;
  columns?: number;
  /** Draw the header row. */
  header?: boolean;
}

const TableGrid = styled.div<{ $cols: number }>`
  display: grid;
  grid-template-columns: 1.6fr repeat(${({ $cols }) => Math.max($cols - 1, 1)}, 1fr);
  gap: ${({ theme }) => theme.spacing[4]};
  align-items: center;
  padding: ${({ theme }) => `${theme.spacing[3]} ${theme.spacing[5]}`};

  & + & {
    border-top: 1px solid ${({ theme }) => theme.color.border};
  }
`;

const TableHead = styled(TableGrid)`
  background: ${({ theme }) => theme.color.muted};
`;

export function SkeletonTable({ rows = 6, columns = 5, header = true }: SkeletonTableProps) {
  return (
    <Surface>
      {header && (
        <TableHead $cols={columns}>
          {Array.from({ length: columns }, (_, c) => (
            <Skeleton key={c} shape="text" height={9} width={c === 0 ? '46%' : '58%'} />
          ))}
        </TableHead>
      )}
      {Array.from({ length: rows }, (_, r) => (
        <TableGrid key={r} $cols={columns}>
          {Array.from({ length: columns }, (_, c) => (
            <Skeleton
              key={c}
              shape="text"
              height={12}
              width={c === 0 ? LABEL_WIDTHS[r % LABEL_WIDTHS.length] : c === columns - 1 ? '48%' : '70%'}
            />
          ))}
        </TableGrid>
      ))}
    </Surface>
  );
}

/* ─────────────────────────── KPI row ─────────────────────────── */

export interface SkeletonKpiRowProps {
  count?: number;
}

/*
 * MOBILE STRICT: the real KPI row is a scroll-snapped strip below `md`, never
 * a tall stacked column. Its placeholder has to behave the same way or the
 * page reflows the moment data lands.
 */
const KpiStrip = styled.div<{ $count: number }>`
  display: grid;
  grid-template-columns: repeat(${({ $count }) => $count}, minmax(0, 1fr));
  gap: ${({ theme }) => theme.spacing[4]};
  width: 100%;

  @media ${({ theme }) => theme.media.belowMd} {
    grid-auto-flow: column;
    grid-auto-columns: 46%;
    grid-template-columns: none;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;

    &::-webkit-scrollbar {
      display: none;
    }

    > * {
      scroll-snap-align: start;
    }
  }
`;

const KpiTile = styled.div`
  background: ${({ theme }) => theme.surface.card};
  border: 1px solid ${({ theme }) => theme.surface.border};
  border-radius: ${({ theme }) => theme.radii.md};
  box-shadow: ${({ theme }) => theme.surface.shadow};
  padding: ${({ theme }) => theme.spacing[4]};

  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
  min-width: 0;
`;

export function SkeletonKpiRow({ count = 4 }: SkeletonKpiRowProps) {
  return (
    <KpiStrip $count={count}>
      {Array.from({ length: count }, (_, i) => (
        <KpiTile key={i}>
          <Skeleton shape="text" height={9} width="52%" />
          <Skeleton shape="text" height={22} width="68%" />
          <Skeleton shape="text" height={9} width="38%" />
        </KpiTile>
      ))}
    </KpiStrip>
  );
}

/* ─────────────────────────── chart ─────────────────────────── */

export interface SkeletonChartProps {
  height?: number;
  /** `bars` draws a staggered bar silhouette; `area` draws one block. */
  variant?: 'bars' | 'area';
}

const Bars = styled.div<{ $h: number }>`
  display: flex;
  align-items: flex-end;
  gap: ${({ theme }) => theme.spacing[2]};
  height: ${({ $h }) => $h}px;
  width: 100%;
`;

/* Fixed, not random — a placeholder that reshuffles on every render flickers. */
const BAR_HEIGHTS = [46, 72, 38, 88, 60, 95, 54, 78, 42, 66, 84, 50];

export function SkeletonChart({ height = 180, variant = 'bars' }: SkeletonChartProps) {
  if (variant === 'area') return <Skeleton height={height} />;

  return (
    <Bars $h={height}>
      {BAR_HEIGHTS.map((h, i) => (
        <Skeleton key={i} shape="text" height={`${h}%`} />
      ))}
    </Bars>
  );
}

/* ─────────────────────────── page ─────────────────────────── */

export interface SkeletonPageProps {
  /** Draw the KPI strip above the modules. */
  kpis?: number;
  /** Column spans of the module cards to draw, in order. 12 = full width. */
  modules?: number[];
}

/*
 * Mirrors `ModuleGrid`'s 12-column grid and its two-step collapse, so a page
 * loading through this and then rendering its real modules does not shift.
 */
const PageGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: ${({ theme }) => theme.spacing[5]};
  max-width: 1240px;
  width: 100%;
`;

const PageCell = styled.div<{ $span: number }>`
  grid-column: span ${({ $span }) => $span};
  min-width: 0;

  @media ${({ theme }) => theme.media.belowLg} {
    grid-column: span ${({ $span }) => ($span <= 6 ? 6 : 12)};
  }

  @media ${({ theme }) => theme.media.belowMd} {
    grid-column: span 12;
  }
`;

export function SkeletonPage({ kpis = 4, modules = [7, 5, 12] }: SkeletonPageProps) {
  return (
    <Stack $gap="24px">
      {kpis > 0 && <SkeletonKpiRow count={kpis} />}
      <PageGrid>
        {modules.map((span, i) => (
          <PageCell key={i} $span={span}>
            <SkeletonCard bodyHeight={span >= 12 ? 120 : 180} />
          </PageCell>
        ))}
      </PageGrid>
    </Stack>
  );
}
