import styled, { css } from 'styled-components'
import { tabularNums, textRole } from '@ledgr/ui'

/*
 * Shared building blocks for the module kinds. Everything here is a direct
 * port of a repeated pattern in the redesign canvas — the row with a hairline
 * under it, the chip, the value cell — so the 18 kinds stay consistent with
 * each other by construction rather than by discipline.
 */

/** A list row with a hairline beneath and a hover wash. The canvas's workhorse. */
export const Row = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: 11px ${({ theme }) => theme.spacing[1]};
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radii.xs};
  transition: background 150ms;

  &:hover {
    background: ${({ theme }) => theme.color.muted};
  }
`

export const RowBody = styled.div`
  min-width: 0;
  flex: 1;
`

export const RowTitle = styled.div`
  ${textRole('body-l')};
`

export const RowMeta = styled.div`
  ${textRole('label')};
  color: ${({ theme }) => theme.color.mutedForeground};
  margin-top: 2px;
`

export const RowValue = styled.span`
  ${textRole('body-m')};
  font-weight: 700;
  ${tabularNums};
  flex-shrink: 0;
  text-align: right;
  min-width: 64px;
`

/**
 * Status chip. This is one of the two places `radii.pill` is permitted — see
 * the note on the token. Buttons and bars elsewhere in these modules use the
 * flat scale.
 */
export const Chip = styled.span<{ $bg: string; $color: string }>`
  ${textRole('label')};
  font-weight: 600;
  padding: 3px 9px;
  border-radius: ${({ theme }) => theme.radii.pill};
  background: ${({ $bg }) => $bg};
  color: ${({ $color }) => $color};
  flex-shrink: 0;
  white-space: nowrap;
`

/** Section label above a control group or textarea. */
export const FieldLabel = styled.div`
  ${textRole('micro')};
  text-transform: uppercase;
  color: ${({ theme }) => theme.color.mutedForeground};
  margin-bottom: 7px;
`

/**
 * Track for any horizontal meter. Radius uses the flat scale deliberately:
 * on a 5–7px-tall bar the browser clamps radius to half the height, so this
 * renders identically to the canvas's 99px while honouring the no-pill rule.
 */
export const Track = styled.div<{ $height?: number }>`
  height: ${({ $height = 7 }) => $height}px;
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) => theme.color.muted};
  overflow: hidden;
`

export const TrackFill = styled.div<{ $pct: string; $color: string }>`
  height: 100%;
  width: ${({ $pct }) => $pct};
  border-radius: inherit;
  background: ${({ $color }) => $color};
  transition: width 450ms ease;
`

/** Primary action inside a module body. */
export const ModuleButton = styled.button<{ $variant?: 'primary' | 'ghost' }>`
  ${textRole('body-s')};
  font-weight: ${({ $variant }) => ($variant === 'primary' ? 700 : 600)};
  font-family: inherit;
  padding: 6px 13px;
  border-radius: ${({ theme }) => theme.radii.xs};
  cursor: pointer;
  white-space: nowrap;
  transition: background 150ms, color 150ms, border-color 150ms, transform 150ms;

  ${({ $variant = 'ghost', theme }) =>
    $variant === 'primary'
      ? css`
          background: ${theme.color.accent};
          color: ${theme.color.accentForeground};
          border: none;

          &:hover {
            background: ${theme.color.primaryHover};
            transform: translateY(-1px);
          }
          &:active {
            transform: translateY(0);
          }
        `
      : css`
          background: transparent;
          border: 1px solid ${theme.color.border};
          color: ${theme.color.mutedForeground};

          &:hover {
            background: ${theme.color.muted};
            color: ${theme.color.foreground};
            border-color: ${theme.color.borderHover};
          }
        `}
`

/** Toggle track. A true capsule, which the no-pill rule exempts as structural. */
export const ToggleTrack = styled.span<{ $on: boolean; $w?: number; $h?: number }>`
  width: ${({ $w = 40 }) => $w}px;
  height: ${({ $h = 23 }) => $h}px;
  border-radius: ${({ theme }) => theme.radii.full};
  background: ${({ $on, theme }) => ($on ? theme.color.accent : theme.color.muted)};
  padding: 2.5px;
  display: flex;
  justify-content: ${({ $on }) => ($on ? 'flex-end' : 'flex-start')};
  align-items: center;
  flex-shrink: 0;
  cursor: pointer;
  transition: background 200ms;
`

export const ToggleKnob = styled.span<{ $on: boolean; $size?: number }>`
  width: ${({ $size = 18 }) => $size}px;
  height: ${({ $size = 18 }) => $size}px;
  border-radius: 50%;
  background: ${({ $on, theme }) => ($on ? theme.color.accentForeground : theme.color.mutedForeground)};
  box-shadow: ${({ theme }) => theme.elevation[1]};
`

/** Column of rows with no gap — the hairlines do the separating. */
export const Stack = styled.div<{ $gap?: number }>`
  display: flex;
  flex-direction: column;
  ${({ $gap }) => $gap !== undefined && css`gap: ${$gap}px;`}
`
