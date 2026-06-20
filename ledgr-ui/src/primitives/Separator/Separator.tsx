import type { HTMLAttributes } from 'react';
import styled, { css } from 'styled-components';

export interface SeparatorProps extends HTMLAttributes<HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical';
  /** If true, ignored by assistive tech. Default true (most separators are decorative). */
  decorative?: boolean;
}

const Root = styled.div<{ $orientation: 'horizontal' | 'vertical' }>`
  background: ${({ theme }) => theme.color.border};
  flex-shrink: 0;
  ${({ $orientation }) => $orientation === 'horizontal'
    ? css`width: 100%; height: 1px;`
    : css`height: auto; width: 1px; align-self: stretch;`}
`;

export function Separator({
  orientation = 'horizontal',
  decorative = true,
  ...rest
}: SeparatorProps) {
  return (
    <Root
      $orientation={orientation}
      role={decorative ? 'none' : 'separator'}
      aria-orientation={decorative ? undefined : orientation}
      {...rest}
    />
  );
}
