import { forwardRef } from 'react';
import type { HTMLAttributes, ElementType } from 'react';
import styled, { css } from 'styled-components';
import type { tokens } from '../../theme/tokens';

type SpacingKey = keyof typeof tokens.spacing;

export interface StackProps extends HTMLAttributes<HTMLDivElement> {
  /** Render as a different HTML element. */
  as?: ElementType;
  direction?: 'row' | 'column';
  gap?: SpacingKey;
  align?: 'start' | 'center' | 'end' | 'stretch' | 'baseline';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
  wrap?: boolean;
  /** Convenience: stretch to fill parent. */
  fullWidth?: boolean;
}

const alignMap = {
  start: 'flex-start', center: 'center', end: 'flex-end', stretch: 'stretch', baseline: 'baseline',
} as const;

const justifyMap = {
  start: 'flex-start', center: 'center', end: 'flex-end',
  between: 'space-between', around: 'space-around', evenly: 'space-evenly',
} as const;

const Root = styled.div<{
  $direction: 'row' | 'column';
  $gap: SpacingKey;
  $align: keyof typeof alignMap;
  $justify: keyof typeof justifyMap;
  $wrap: boolean;
  $fullWidth: boolean;
}>`
  display: flex;
  flex-direction: ${({ $direction }) => $direction};
  gap: ${({ theme, $gap }) => theme.spacing[$gap]};
  align-items: ${({ $align }) => alignMap[$align]};
  justify-content: ${({ $justify }) => justifyMap[$justify]};
  flex-wrap: ${({ $wrap }) => ($wrap ? 'wrap' : 'nowrap')};
  ${({ $fullWidth }) => $fullWidth && css`width: 100%;`}
`;

export const Stack = forwardRef<HTMLDivElement, StackProps>(function Stack(
  {
    direction = 'column',
    gap = 3,
    align = 'stretch',
    justify = 'start',
    wrap = false,
    fullWidth = false,
    ...rest
  },
  ref,
) {
  return (
    <Root
      ref={ref}
      $direction={direction}
      $gap={gap}
      $align={align}
      $justify={justify}
      $wrap={wrap}
      $fullWidth={fullWidth}
      {...rest}
    />
  );
});

/* Convenience: horizontal stack */
export const Inline = forwardRef<HTMLDivElement, Omit<StackProps, 'direction'>>(
  function Inline(props, ref) {
    return <Stack ref={ref} direction="row" align="center" {...props} />;
  },
);
