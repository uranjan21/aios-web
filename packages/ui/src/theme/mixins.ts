/**
 * Style mixins — the intended way to consume the token scales.
 *
 * These exist because the previous system let each of four typographic
 * properties be set independently, so 453 hardcoded `font-size` declarations
 * accumulated with no matching line-height or tracking. `textRole` lands all
 * four together, which makes "use the token" the shortest path rather than the
 * most disciplined one.
 */
import { css } from 'styled-components';
import type { TextRole } from './tokens';

/** Apply a complete text role: size, line-height, tracking and weight. */
export const textRole = (role: TextRole) => css`
  font-size: ${({ theme }) => theme.typography.role[role].size};
  line-height: ${({ theme }) => theme.typography.role[role].line};
  letter-spacing: ${({ theme }) => theme.typography.role[role].tracking};
  font-weight: ${({ theme }) => theme.typography.role[role].weight};
`;

/** Tabular figures. Use on any aligned number — replaces the removed mono face. */
export const tabularNums = css`
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'tnum' 1;
`;

/**
 * The one focus treatment. Before this, ~69 components hand-wrote their own
 * `:focus-visible` block and disagreed on both colour and offset; the helper
 * that was supposed to prevent that was never exported from the package index.
 */
export const focusRing = css`
  &:focus-visible {
    outline: ${({ theme }) => theme.border.focus} solid ${({ theme }) => theme.color.ring};
    outline-offset: 2px;
  }
`;

/** Focus ring drawn inside the element, for flush-edge controls. */
export const insetFocusRing = css`
  &:focus-visible {
    outline: ${({ theme }) => theme.border.focus} solid ${({ theme }) => theme.color.ring};
    outline-offset: -2px;
  }
`;

/** Visually hidden but available to assistive technology. */
export const visuallyHidden = css`
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

/** Raised surface at a given depth, with the mode-correct treatment. */
export const surface = (level: 1 | 2 | 3 | 4 | 5 = 1) => css`
  background: ${({ theme }) => theme.color.card};
  border: ${({ theme }) => theme.border.hairline} solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radii.md};
  box-shadow: ${({ theme }) => theme.elevation[level]};
`;

/**
 * Translucent glass layer. Only for overlay chrome — never apply to a
 * scrolling data surface, backdrop-filter is expensive to composite.
 */
export const glass = (weight: 'thin' | 'regular' | 'thick' = 'regular') => css`
  background: ${({ theme }) => theme.glass.background};
  border: ${({ theme }) => theme.border.hairline} solid ${({ theme }) => theme.glass.border};
  backdrop-filter: ${({ theme }) => theme.glass[weight]};
  -webkit-backdrop-filter: ${({ theme }) => theme.glass[weight]};
`;

/** Truncate to a single line. */
export const truncate = css`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;
