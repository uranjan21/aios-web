import { css } from 'styled-components';

/**
 * Hide content visually but keep it announceable to screen readers.
 * Use for labels on icon-only buttons, skip links, etc.
 */
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
