import { Skeleton } from '@aios/shared/components/ui/skeleton'
import { ToolbarIconBtn } from '@ledgr/ui'
import styled from 'styled-components'

export const StyledSkeleton = styled(Skeleton)<{ $height?: string; $width?: string; $margin?: string }>`
  height: ${({ $height }) => $height || 'auto'};
  width: ${({ $width }) => $width || '100%'};
  ${({ $margin }) => $margin && `margin: ${$margin};`}
`

export const DesktopSearch = styled.div`
  display: none;
  @media (min-width: 640px) {
    display: block;
  }
`

export const MobileSearchBtn = styled(ToolbarIconBtn)`
  display: flex;
  @media (min-width: 640px) {
    display: none;
  }
`

export const ListHeaderRoot = styled.div<{ $selecting: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 40px;
  padding: 4px 4px 8px;
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
  background: ${({ theme, $selecting }) => $selecting ? `color-mix(in srgb, ${theme.color.primary} 5%, ${theme.color.card})` : theme.color.card};
  border-radius: ${({ theme, $selecting }) => $selecting ? `${theme.radii.sm} ${theme.radii.sm} 0 0` : '0'};
  transition: background 120ms ease;
`

export const ListHeaderLabel = styled.div`
  font-size: 12px;
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
  gap: 6px;
  flex-wrap: wrap;
  justify-content: flex-end;
`

export const SortBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 12px;
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ theme }) => theme.color.border};
  background: ${({ theme }) => theme.color.card};
  color: ${({ theme }) => theme.color.foreground};
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background 120ms ease, border-color 120ms ease;
  &:hover { background: ${({ theme }) => theme.color.muted}; }
  &:focus-visible { outline: 2px solid ${({ theme }) => theme.color.primary}; outline-offset: 2px; }
  & svg { color: ${({ theme }) => theme.color.mutedForeground}; }
`
