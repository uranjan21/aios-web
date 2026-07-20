import styled, { keyframes } from 'styled-components';
import type { HTMLAttributes } from 'react';

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  width?: string | number;
  height?: string | number;
  /** Shape preset. */
  shape?: 'rect' | 'pill' | 'circle' | 'text';
}

const pulse = keyframes`
  0%, 100% { opacity: 0.7; }
  50%      { opacity: 0.4; }
`;

const Root = styled.div<{
  $w?: string | number;
  $h?: string | number;
  $shape: 'rect' | 'pill' | 'circle' | 'text';
}>`
  display: inline-block;
  background: linear-gradient(
    90deg,
    ${({ theme }) => theme.color.muted} 0%,
    ${({ theme }) => theme.color.border} 50%,
    ${({ theme }) => theme.color.muted} 100%
  );
  background-size: 200% 100%;
  animation: ${pulse} 1.6s ease-in-out infinite;
  width:  ${({ $w }) => (typeof $w === 'number' ? `${$w}px` : $w ?? '100%')};
  height: ${({ $h }) => (typeof $h === 'number' ? `${$h}px` : $h ?? '16px')};
  border-radius: ${({ theme, $shape }) => {
    switch ($shape) {
      case 'pill':   return theme.radii.full;
      case 'circle': return theme.radii.full;
      case 'text':   return theme.radii.sm;
      default:       return theme.radii.md;
    }
  }};

  ${({ $shape, $w, $h }) => $shape === 'circle' && `
    width: ${typeof $w === 'number' ? `${$w}px` : $w ?? '32px'};
    height: ${typeof $h === 'number' ? `${$h}px` : $h ?? typeof $w === 'number' ? `${$w}px` : $w ?? '32px'};
  `}
`;

export function Skeleton({ width, height, shape = 'rect', ...rest }: SkeletonProps) {
  return <Root $w={width} $h={height} $shape={shape} aria-hidden="true" {...rest} />;
}

export const SkeletonGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[2]};
`;
