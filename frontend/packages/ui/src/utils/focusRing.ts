import { css } from 'styled-components';

/**
 * Consistent focus-visible ring across all interactive components.
 * Always pair with `outline: none` on the base style.
 */
export const focusRing = css`
  outline: none;
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.ring};
    outline-offset: 2px;
  }
`;

export const insetFocusRing = css`
  outline: none;
  &:focus-visible {
    box-shadow: inset 0 0 0 2px ${({ theme }) => theme.color.ring};
  }
`;
