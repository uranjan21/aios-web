/**
 * Skeleton — the loading placeholder primitive.
 *
 * Rendering is delegated to `react-loading-skeleton`, which gives us a real
 * travelling shimmer (a gradient swept by `transform: translateX`, i.e. one
 * composited layer) instead of the opacity pulse this used to be. The prop API
 * (`width` / `height` / `shape`) is unchanged, so every existing call site
 * keeps working and simply looks better.
 *
 * WHY THE CSS IS RESTATED HERE and not imported from
 * `react-loading-skeleton/dist/skeleton.css`: this package ships through tsup
 * as a styled-components library with no CSS side-effects, and a bare CSS
 * import would force every consumer to wire up a stylesheet. The library's own
 * stylesheet is only structural — the colours it exposes are CSS custom
 * properties, which the component sets inline from the props below. So we
 * restate the structure in the styled wrapper and keep the theme as the single
 * source of colour.
 */
import styled, { css, useTheme } from 'styled-components';
import type { CSSProperties } from 'react';
import BaseSkeleton from 'react-loading-skeleton';

/**
 * `chip` exists because `rect`'s `radii.md` over-rounds the small icon
 * placeholders in `SkeletonKit`. Small squares need the small corner.
 */
export type SkeletonShape = 'rect' | 'chip' | 'pill' | 'circle' | 'text';

export interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  /** Shape preset. `text` renders slightly tighter corners than a card. */
  shape?: SkeletonShape;
  /** Number of lines to draw. Above 1 they stack with `gap` between them. */
  count?: number;
  /** Gap between stacked lines. Defaults to the 2-step of the spacing scale. */
  gap?: string;
  /** Lay the lines out inline instead of stacked. */
  inline?: boolean;
  /** Shimmer period. Defaults to 1.4s. */
  duration?: number;
  /** Override the resting colour. Defaults to a theme-derived neutral. */
  baseColor?: string;
  /** Override the sweep colour. Defaults to a theme-derived lighter neutral. */
  highlightColor?: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * The structural half of `react-loading-skeleton`'s stylesheet, scoped to this
 * container. `--base-color` / `--highlight-color` / `--animation-duration` are
 * written inline by the library from the props; everything below is layout.
 */
const Container = styled.span<{ $gap: string; $inline: boolean }>`
  display: ${({ $inline }) => ($inline ? 'inline-flex' : 'flex')};
  flex-direction: ${({ $inline }) => ($inline ? 'row' : 'column')};
  gap: ${({ $gap }) => $gap};
  width: 100%;
  line-height: 1;

  .react-loading-skeleton {
    --pseudo-element-display: block;

    display: block;
    width: 100%;
    line-height: 1;

    position: relative;
    overflow: hidden;
    user-select: none;

    background-color: var(--base-color);
  }

  .react-loading-skeleton::after {
    content: ' ';
    display: var(--pseudo-element-display);

    position: absolute;
    inset: 0;

    background-repeat: no-repeat;
    background-image: linear-gradient(
      90deg,
      var(--base-color) 0%,
      var(--highlight-color) 50%,
      var(--base-color) 100%
    );

    transform: translateX(-100%);

    animation-name: ledgr-skeleton-sweep;
    animation-duration: var(--animation-duration);
    animation-timing-function: ease-in-out;
    animation-iteration-count: infinite;
  }

  @keyframes ledgr-skeleton-sweep {
    100% {
      transform: translateX(100%);
    }
  }

  /*
   * The sweep is decoration, not information — a user who has asked for less
   * motion still gets the shape, just without the travelling gradient.
   */
  @media (prefers-reduced-motion: reduce) {
    .react-loading-skeleton {
      --pseudo-element-display: none;
    }
  }

  ${({ $inline }) =>
    $inline &&
    css`
      .react-loading-skeleton {
        width: auto;
      }
    `}
`;

function radiusFor(shape: SkeletonShape, theme: ReturnType<typeof useTheme>): string {
  switch (shape) {
    case 'pill':
    case 'circle':
      return theme.radii.full;
    case 'text':
    case 'chip':
      return theme.radii.sm;
    default:
      return theme.radii.md;
  }
}

export function Skeleton({
  width,
  height,
  shape = 'rect',
  count = 1,
  gap,
  inline = false,
  duration = 1.4,
  baseColor,
  highlightColor,
  className,
  style,
}: SkeletonProps) {
  const theme = useTheme();

  /*
   * Light and dark need opposite derivations. In light mode `muted` is barely
   * distinguishable from a white card, so the resting tone is the border and
   * the sweep lifts back towards the card. In dark mode `muted` IS the visible
   * step above the card, so the sweep lifts towards the muted foreground.
   */
  const base =
    baseColor ??
    (theme.mode === 'dark' ? theme.color.muted : theme.color.border);
  const highlight =
    highlightColor ??
    (theme.mode === 'dark'
      ? `color-mix(in srgb, ${theme.color.muted} 76%, ${theme.color.mutedForeground})`
      : `color-mix(in srgb, ${theme.color.card} 70%, ${theme.color.border})`);

  const isCircle = shape === 'circle';
  const resolvedWidth = isCircle ? (width ?? height ?? 32) : width;
  const resolvedHeight = isCircle ? (height ?? width ?? 32) : (height ?? 16);

  return (
    <Container
      $gap={gap ?? theme.spacing[2]}
      $inline={inline}
      className={className}
      style={style}
      aria-hidden="true"
    >
      <BaseSkeleton
        count={count}
        width={resolvedWidth}
        height={resolvedHeight}
        borderRadius={radiusFor(shape, theme)}
        baseColor={base}
        highlightColor={highlight}
        duration={duration}
        inline={inline}
        /*
         * The library wraps its output in its own container span. Ours already
         * lays the lines out, so we neutralise the inner one and let flex on
         * the styled container own the stacking.
         */
        containerClassName="ledgr-skeleton-lines"
      />
    </Container>
  );
}

export const SkeletonGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[2]};
`;
