import { ToolbarIconBtn, focusRing } from '@ledgr/ui'
import styled from 'styled-components'

/**
 * Inset for the loading rows so they sit on the same left edge as the real
 * transaction rows below the header. Replaces `StyledSkeleton`, a single grey
 * 16rem block that told the reader nothing about what was arriving.
 */
export const TxnLoadingBody = styled.div`
  padding: ${({ theme }) => `${theme.spacing[3]} ${theme.spacing[5]} 0`};
`

/**
 * Page stack: KPI tiles, then the transactions card. The tiles used to render
 * INSIDE the card, below the toolbar — a card nested in a card, which read as
 * a cramped band rather than as the page's summary. Every other Finance page
 * puts its tiles at page level, so this matches them. Gap owns the spacing;
 * children must not add their own margins (see WorkspaceLayout's Main rule).
 */
export const PageStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => `${theme.spacing[5]}`};
`

export const DesktopSearch = styled.div`
  display: none;
  @media ${({ theme }) => theme.media.sm} {
    display: block;
  }
`

export const MobileSearchBtn = styled(ToolbarIconBtn)`
  display: flex;
  @media ${({ theme }) => theme.media.sm} {
    display: none;
  }
`

/** The Card `action` slot's control row — Filter + Add, on one baseline. */
export const CardActions = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => `${theme.spacing[2]}`};
`

export const ListHeaderRoot = styled.div<{ $selecting: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => `${theme.spacing[2.5]}`};
  min-height: 40px;
  padding: ${({ theme }) => `${theme.spacing[1]} ${theme.spacing[1]} ${theme.spacing[2]}`};
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
  background: ${({ theme, $selecting }) => $selecting ? `color-mix(in srgb, ${theme.color.primary} 5%, ${theme.color.card})` : theme.color.card};
  border-radius: ${({ theme, $selecting }) => $selecting ? `${theme.radii.sm} ${theme.radii.sm} 0 0` : '0'};
  transition: background 120ms ease;
`

export const ListHeaderLabel = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: 600;
  color: ${({ theme }) => theme.color.foreground};
  white-space: nowrap;
`

export const ListHeaderSpacer = styled.div`
  flex: 1;
  min-width: 0;
`

export const BulkBtnRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => `${theme.spacing[1.5]}`};
  flex-wrap: wrap;
  justify-content: flex-end;
`

export const SortBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => `${theme.spacing[1.5]}`};
  height: 32px;
  padding: ${({ theme }) => `0 ${theme.spacing[3]}`};
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ theme }) => theme.color.border};
  background: ${({ theme }) => theme.color.card};
  color: ${({ theme }) => theme.color.foreground};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: 500;
  cursor: pointer;
  transition: background 120ms ease, border-color 120ms ease;
  &:hover { background: ${({ theme }) => theme.color.muted}; }
  ${focusRing}
  & svg { color: ${({ theme }) => theme.color.mutedForeground}; }
`
