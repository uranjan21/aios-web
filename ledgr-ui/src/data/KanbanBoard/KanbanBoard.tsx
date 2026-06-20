/**
 * KanbanBoard — themeable, presentation-only board.
 *
 * Intentionally drag-and-drop agnostic: the host wires its own dnd lib (dnd-kit,
 * react-dnd, native HTML5) and tells the board which column each card lives in.
 * The board just lays out columns + a card slot per item.
 */
import type { ReactNode } from 'react';
import styled from 'styled-components';

export interface KanbanColumn<Status extends string = string> {
  key: Status;
  label: ReactNode;
  /** Optional accent color (any theme.color key or CSS color). */
  accent?: string;
  /** Optional badge in the header (e.g. count). */
  badge?: ReactNode;
}

export interface KanbanBoardProps<Status extends string = string, Item = unknown> {
  columns: KanbanColumn<Status>[];
  items: Item[];
  getItemStatus: (item: Item) => Status;
  getItemKey: (item: Item) => string;
  renderCard: (item: Item) => ReactNode;
  /** Optional renderer for a column header (e.g. Add button). */
  renderColumnHeader?: (column: KanbanColumn<Status>, count: number) => ReactNode;
  /** Optional renderer for empty columns. */
  renderEmpty?: (column: KanbanColumn<Status>) => ReactNode;
  className?: string;
}

const Board = styled.div`
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(280px, 1fr);
  gap: ${({ theme }) => theme.spacing[3]};
  overflow-x: auto;
  padding-bottom: ${({ theme }) => theme.spacing[2]};
  scrollbar-width: thin;
`;

const Column = styled.div`
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.color.muted};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing[3]};
  min-width: 280px;
  max-height: 100%;
`;

const ColHeader = styled.div<{ $accent?: string }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing[2]};
  padding: 0 ${({ theme }) => theme.spacing[1]};
  margin-bottom: ${({ theme }) => theme.spacing[3]};
  border-left: 3px solid ${({ $accent, theme }) => $accent ?? theme.color.primary};
  padding-left: ${({ theme }) => theme.spacing[2]};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  text-transform: uppercase;
  letter-spacing: ${({ theme }) => theme.typography.letterSpacing.wide};
  color: ${({ theme }) => theme.color.mutedForeground};
`;

const Count = styled.span`
  background: ${({ theme }) => theme.color.card};
  color: ${({ theme }) => theme.color.mutedForeground};
  padding: 2px 6px;
  border-radius: ${({ theme }) => theme.radii.full};
  font-size: 10px;
`;

const Cards = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[2]};
  overflow-y: auto;
  flex: 1;
`;

const DefaultEmpty = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing[5]};
  color: ${({ theme }) => theme.color.mutedForeground};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  border: 1px dashed ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radii.md};
`;

export function KanbanBoard<Status extends string, Item>({
  columns,
  items,
  getItemStatus,
  getItemKey,
  renderCard,
  renderColumnHeader,
  renderEmpty,
  className,
}: KanbanBoardProps<Status, Item>) {
  return (
    <Board className={className}>
      {columns.map(col => {
        const colItems = items.filter(it => getItemStatus(it) === col.key);
        return (
          <Column key={col.key}>
            <ColHeader $accent={col.accent}>
              {renderColumnHeader ? renderColumnHeader(col, colItems.length) : (
                <>
                  <span>{col.label}</span>
                  {col.badge ?? <Count>{colItems.length}</Count>}
                </>
              )}
            </ColHeader>
            <Cards>
              {colItems.length === 0
                ? (renderEmpty ? renderEmpty(col) : <DefaultEmpty>No items</DefaultEmpty>)
                : colItems.map(it => (
                    <div key={getItemKey(it)}>{renderCard(it)}</div>
                  ))}
            </Cards>
          </Column>
        );
      })}
    </Board>
  );
}
