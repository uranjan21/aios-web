import { useId, useRef, useState, cloneElement, isValidElement } from 'react';
import type { ReactElement, ReactNode } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { Portal } from '../../utils/Portal';
import { useDelayedOpen } from '../../utils/hooks';

export type TooltipSide = 'top' | 'right' | 'bottom' | 'left';

export interface TooltipProps {
  /** The element the tooltip describes. Must accept a ref and event handlers. */
  children: ReactElement;
  /** Content shown inside the floating tooltip. */
  content: ReactNode;
  side?: TooltipSide;
  /** ms to wait before showing on hover. */
  delay?: number;
  /** Disable the tooltip entirely. */
  disabled?: boolean;
}

interface Pos { top: number; left: number; }

function computePosition(target: DOMRect, side: TooltipSide, gap = 8): Pos {
  switch (side) {
    case 'top':    return { top: target.top - gap,            left: target.left + target.width / 2 };
    case 'bottom': return { top: target.bottom + gap,         left: target.left + target.width / 2 };
    case 'left':   return { top: target.top + target.height/2, left: target.left - gap };
    case 'right':  return { top: target.top + target.height/2, left: target.right + gap };
  }
}

const fadeIn = keyframes`
  from { opacity: 0; transform: translate(var(--tx), var(--ty)) scale(0.96); }
  to   { opacity: 1; transform: translate(var(--tx), var(--ty)) scale(1); }
`;

const TooltipBox = styled.div<{ $side: TooltipSide; $top: number; $left: number }>`
  position: fixed;
  top: ${({ $top }) => `${$top}px`};
  left: ${({ $left }) => `${$left}px`};
  z-index: ${({ theme }) => theme.zIndex.tooltip};
  background: ${({ theme }) => theme.color.foreground};
  color: ${({ theme }) => theme.color.background};
  padding: ${({ theme }) => `${theme.spacing[1]} ${theme.spacing[3]}`};
  border-radius: ${({ theme }) => theme.radii.md};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  line-height: ${({ theme }) => theme.typography.lineHeight.snug};
  white-space: nowrap;
  pointer-events: none;
  box-shadow: ${({ theme }) => theme.shadow.md};
  animation: ${fadeIn} ${({ theme }) => theme.motion.duration.fast} ${({ theme }) => theme.motion.easing.enter};
  ${({ $side }) => {
    const tx = $side === 'left' ? '-100%' : $side === 'right' ? '0' : '-50%';
    const ty = $side === 'top' ? '-100%' : $side === 'bottom' ? '0' : '-50%';
    return css`
      --tx: ${tx};
      --ty: ${ty};
      transform: translate(${tx}, ${ty});
    `;
  }}
`;

export function Tooltip({
  children,
  content,
  side = 'top',
  delay = 300,
  disabled = false,
}: TooltipProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<Pos>({ top: 0, left: 0 });
  const ref = useRef<HTMLElement | null>(null);
  const { open: schedule, cancel } = useDelayedOpen(delay);
  const id = useId();

  const measure = () => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setPos(computePosition(rect, side));
  };

  const show = () => {
    if (disabled || !content) return;
    schedule(() => { measure(); setOpen(true); });
  };
  const hide = () => { cancel(); setOpen(false); };

  if (!isValidElement(children)) return children;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const childProps = (children.props ?? {}) as any;
  const enhancedChild = cloneElement(children as ReactElement<Record<string, unknown>>, {
    ref: (node: HTMLElement | null) => {
      ref.current = node;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const originalRef = (children as any).ref;
      if (typeof originalRef === 'function') originalRef(node);
      else if (originalRef && typeof originalRef === 'object') originalRef.current = node;
    },
    onMouseEnter: (e: unknown) => { show(); childProps.onMouseEnter?.(e); },
    onMouseLeave: (e: unknown) => { hide(); childProps.onMouseLeave?.(e); },
    onFocus:      (e: unknown) => { show(); childProps.onFocus?.(e); },
    onBlur:       (e: unknown) => { hide(); childProps.onBlur?.(e); },
    'aria-describedby': open ? id : childProps['aria-describedby'],
  });

  return (
    <>
      {enhancedChild}
      {open && (
        <Portal>
          <TooltipBox role="tooltip" id={id} $side={side} $top={pos.top} $left={pos.left}>
            {content}
          </TooltipBox>
        </Portal>
      )}
    </>
  );
}
