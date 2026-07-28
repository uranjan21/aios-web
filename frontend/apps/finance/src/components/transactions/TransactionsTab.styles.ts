import { Skeleton } from '@ct/shared/components/ui/skeleton'
import { ToolbarIconBtn, focusRing } from '@ledgr/ui'
import styled from 'styled-components'

export const StyledSkeleton = styled(Skeleton)<{ $height?: string; $width?: string; $margin?: string }>`
  height: ${({ $height }) => $height || 'auto'};
  width: ${({ $width }) => $width || '100%'};
  ${({ $margin }) => $margin && `margin: ${$margin};`}
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
