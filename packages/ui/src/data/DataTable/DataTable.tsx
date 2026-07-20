/**
 * DataTable — accessible, themable, generic table primitive.
 *
 * Renders a column definition array against a typed row array.
 * Out of scope (intentionally): sorting/filtering/pagination as state —
 * consumer drives those and passes data in already-shaped.
 */
import type { ReactNode, Key } from 'react';
import styled from 'styled-components';
import { EmptyState } from '../../patterns/EmptyState/EmptyState';

export interface DataColumn<Row> {
  /** Stable key. */
  id: string;
  /** Header cell. */
  header: ReactNode;
  /** Cell renderer. */
  cell: (row: Row, index: number) => ReactNode;
  /** Optional `th` width style (e.g. "120px", "20%"). */
  width?: string;
  /** Cell alignment. */
  align?: 'left' | 'center' | 'right';
  /** Hide on small screens. */
  hideBelow?: 'sm' | 'md' | 'lg';
}

export interface DataTableProps<Row> {
  columns: DataColumn<Row>[];
  rows: Row[];
  /** Map a row to a stable React key. */
  getRowKey: (row: Row, index: number) => Key;
  /** Row click handler — when set, rows are interactive. */
  onRowClick?: (row: Row, index: number) => void;
  /** Loading state (renders skeleton rows). */
  loading?: boolean;
  /** Empty-state config when rows is empty AND not loading. */
  empty?: { title: ReactNode; description?: ReactNode; action?: ReactNode; icon?: ReactNode };
  /** Visual density. */
  density?: 'compact' | 'normal';
  /** Sticky header. */
  stickyHeader?: boolean;
  /** Accessible caption (visually hidden). */
  caption?: ReactNode;
  /** Number of skeleton rows when loading (default 5). */
  skeletonRows?: number;
  className?: string;
}

const Wrap = styled.div`
  background: ${({ theme }) => theme.color.card};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  overflow: hidden;
`;

const ScrollArea = styled.div`
  overflow-x: auto;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-family: ${({ theme }) => theme.typography.fontFamily.sans};
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  color: ${({ theme }) => theme.color.foreground};
`;

const Th = styled.th<{ $align?: 'left' | 'center' | 'right'; $sticky: boolean; $hideBelow?: 'sm' | 'md' | 'lg' }>`
  text-align: ${({ $align }) => $align ?? 'left'};
  background: ${({ theme }) => theme.color.muted};
  color: ${({ theme }) => theme.color.mutedForeground};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  text-transform: uppercase;
  letter-spacing: ${({ theme }) => theme.typography.letterSpacing.wide};
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[3]}`};
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
  white-space: nowrap;
  position: ${({ $sticky }) => ($sticky ? 'sticky' : 'static')};
  top: 0;
  z-index: 1;
  ${({ $hideBelow, theme }) => $hideBelow && `
    @media (max-width: ${theme.breakpoint[$hideBelow]}) {
      display: none;
    }
  `}
`;

const ResponsiveTd = styled.td<{ $align?: 'left' | 'center' | 'right'; $density: 'compact' | 'normal'; $hideBelow?: 'sm' | 'md' | 'lg' }>`
  padding: ${({ theme, $density }) => $density === 'compact'
    ? `${theme.spacing[2]} ${theme.spacing[3]}`
    : `${theme.spacing[3]} ${theme.spacing[3]}`};
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
  text-align: ${({ $align }) => $align ?? 'left'};
  vertical-align: middle;
  ${({ $hideBelow, theme }) => $hideBelow && `
    @media (max-width: ${theme.breakpoint[$hideBelow]}) {
      display: none;
    }
  `}
  tr:last-child & { border-bottom: none; }
`;

const Tr = styled.tr<{ $interactive: boolean }>`
  cursor: ${({ $interactive }) => ($interactive ? 'pointer' : 'default')};
  transition: background-color ${({ theme }) => theme.motion.duration.fast} ${({ theme }) => theme.motion.easing.standard};
  &:hover {
    background: ${({ theme, $interactive }) => ($interactive ? theme.color.muted + '60' : 'transparent')};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.ring};
    outline-offset: -2px;
  }
`;


const Td = ResponsiveTd;

const Caption = styled.caption`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`;

const SkeletonBar = styled.div`
  height: 12px;
  width: 80%;
  background: ${({ theme }) => theme.color.muted};
  border-radius: ${({ theme }) => theme.radii.sm};
  animation: pulse 1.6s ease-in-out infinite;
  @keyframes pulse {
    0%, 100% { opacity: 0.7; }
    50%      { opacity: 0.4; }
  }
`;

export function DataTable<Row>({
  columns,
  rows,
  getRowKey,
  onRowClick,
  loading = false,
  empty,
  density = 'normal',
  stickyHeader = false,
  caption,
  skeletonRows = 5,
  className,
}: DataTableProps<Row>) {
  if (!loading && rows.length === 0 && empty) {
    return (
      <Wrap className={className}>
        <EmptyState icon={empty.icon} title={empty.title} description={empty.description} action={empty.action} />
      </Wrap>
    );
  }

  return (
    <Wrap className={className}>
      <ScrollArea>
        <Table>
          {caption && <Caption>{caption}</Caption>}
          <thead>
            <tr>
              {columns.map(col => (
                <Th
                  key={col.id}
                  scope="col"
                  $align={col.align}
                  $sticky={stickyHeader}
                  $hideBelow={col.hideBelow}
                  style={{ width: col.width }}
                >
                  {col.header}
                </Th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: skeletonRows }).map((_, i) => (
                  <Tr key={`sk-${i}`} $interactive={false}>
                    {columns.map(col => (
                      <Td key={col.id} $align={col.align} $density={density} $hideBelow={col.hideBelow}><SkeletonBar /></Td>
                    ))}
                  </Tr>
                ))
              : rows.map((row, idx) => (
                  <Tr
                    key={getRowKey(row, idx)}
                    $interactive={!!onRowClick}
                    tabIndex={onRowClick ? 0 : undefined}
                    role={onRowClick ? 'button' : undefined}
                    onClick={onRowClick ? () => onRowClick(row, idx) : undefined}
                    onKeyDown={onRowClick ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onRowClick(row, idx);
                      }
                    } : undefined}
                  >
                    {columns.map(col => (
                      <Td key={col.id} $align={col.align} $density={density} $hideBelow={col.hideBelow}>{col.cell(row, idx)}</Td>
                    ))}
                  </Tr>
                ))}
          </tbody>
        </Table>
      </ScrollArea>
    </Wrap>
  );
}
