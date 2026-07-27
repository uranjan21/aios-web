import type { HTMLAttributes } from 'react';
import { useMemo, useState } from 'react';
import styled, { css } from 'styled-components';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface AvatarProps extends HTMLAttributes<HTMLSpanElement> {
  /** Image URL. If missing or fails to load, falls back to initials. */
  src?: string;
  /** Person's name — used to compute initials. */
  name?: string;
  size?: AvatarSize;
  /** Override initials computation. */
  initials?: string;
  /** Image alt text — defaults to `name`. */
  alt?: string;
}

const sizeMap: Record<AvatarSize, { box: string; font: string }> = {
  xs: { box: '20px', font: '10px' },
  sm: { box: '28px', font: '11px' },
  md: { box: '36px', font: '13px' },
  lg: { box: '48px', font: '16px' },
  xl: { box: '64px', font: '20px' },
};

const Root = styled.span<{ $size: AvatarSize }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: ${({ theme }) => theme.radii.full};
  background: ${({ theme }) => theme.color.primary};
  color: ${({ theme }) => theme.color.primaryForeground};
  box-shadow: none;
  font-family: ${({ theme }) => theme.typography.fontFamily.sans};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  flex-shrink: 0;
  user-select: none;

  ${({ $size }) => css`
    width: ${sizeMap[$size].box};
    height: ${sizeMap[$size].box};
    font-size: ${sizeMap[$size].font};
  `}

  & > img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

function computeInitials(name?: string): string {
  if (!name) return '?';
  return name
    .split(' ')
    .filter(Boolean)
    .map(p => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function Avatar({
  src,
  name,
  size = 'md',
  initials,
  alt,
  ...rest
}: AvatarProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const fallback = useMemo(() => initials ?? computeInitials(name), [initials, name]);
  const showImg = src && !imgFailed;

  return (
    <Root $size={size} aria-label={!showImg ? (alt ?? name) : undefined} role="img" {...rest}>
      {showImg ? (
        <img src={src} alt={alt ?? name ?? ''} onError={() => setImgFailed(true)} />
      ) : (
        <span aria-hidden="true">{fallback}</span>
      )}
    </Root>
  );
}
