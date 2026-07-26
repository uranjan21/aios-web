import { createContext, useContext, useId, useRef, useState, useLayoutEffect, useCallback, cloneElement, isValidElement } from 'react';
import type { ReactElement, ReactNode } from 'react';
import styled, { keyframes } from 'styled-components';
import { Portal } from '../../utils/Portal';
import { useOnClickOutside, useEscapeKey, useControllableState } from '../../utils/hooks';

export type PopoverSide = 'top' | 'right' | 'bottom' | 'left';
export type PopoverAlign = 'start' | 'center' | 'end';

interface Ctx {
  open: boolean;
  setOpen: (v: boolean) => void;
  triggerRef: React.MutableRefObject<HTMLElement | null>;
  contentId: string;
}

const PopoverCtx = createContext<Ctx | null>(null);
function useCtx() {
  const ctx = useContext(PopoverCtx);
  if (!ctx) throw new Error('Popover.* must be inside <Popover>');
  return ctx;
}

export interface PopoverProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
}

export function Popover({ open: openProp, defaultOpen = false, onOpenChange, children }: PopoverProps) {
  const [open, setOpen] = useControllableState({ value: openProp, defaultValue: defaultOpen, onChange: onOpenChange });
  const triggerRef = useRef<HTMLElement | null>(null);
  const contentId = useId();
  return (
    <PopoverCtx.Provider value={{ open, setOpen, triggerRef, contentId }}>
      {children}
    </PopoverCtx.Provider>
  );
}

export interface PopoverTriggerProps {
  children: ReactElement;
}

export function PopoverTrigger({ children }: PopoverTriggerProps) {
  const { open, setOpen, triggerRef, contentId } = useCtx();
  if (!isValidElement(children)) return children;
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const childProps = (children.props ?? {}) as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const origRef = (children as any).ref;

  const handleRef = useCallback((node: HTMLElement | null) => {
    triggerRef.current = node;
    if (typeof origRef === 'function') origRef(node);
    else if (origRef && typeof origRef === 'object') origRef.current = node;
  }, [origRef, triggerRef]);

  const handleClick = useCallback((e: unknown) => {
    setOpen(!open);
    childProps.onClick?.(e);
  }, [open, setOpen, childProps.onClick]);

  return cloneElement(children as ReactElement<Record<string, unknown>>, {
    ref: handleRef,
    onClick: handleClick,
    'aria-expanded': open,
    'aria-haspopup': 'dialog',
    'aria-controls': open ? contentId : undefined,
  });
}

const popIn = keyframes`
  from { opacity: 0; transform: scale(0.96); }
  to   { opacity: 1; transform: scale(1); }
`;

const Surface = styled.div<{ $top: number; $left: number; $minWidth: number }>`
  position: fixed;
  top: ${({ $top }) => `${$top}px`};
  left: ${({ $left }) => `${$left}px`};
  z-index: ${({ theme }) => theme.zIndex?.popover ?? 1000};
  min-width: ${({ $minWidth }) => `${$minWidth}px`};
  max-height: calc(100vh - 16px);
  overflow-y: auto;
  background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(20, 24, 34, 0.85)' : 'rgba(255, 255, 255, 0.95)'};
  backdrop-filter: blur(24px) saturate(190%);
  -webkit-backdrop-filter: blur(24px) saturate(190%);
  color: ${({ theme }) => theme.color.popoverForeground};
  border: 1px solid ${({ theme }) => theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : theme.color.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  box-shadow: 0 16px 48px -12px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.15);
  padding: ${({ theme }) => theme.spacing[3]};
  outline: none;
  transform-origin: top left;
  animation: ${popIn} ${({ theme }) => theme.motion.duration.fast} ${({ theme }) => theme.motion.easing.enter};

  /* Hide scrollbar for clean visual unless scroll is necessary */
  scrollbar-width: thin;
  scrollbar-color: ${({ theme }) => theme.color.border} transparent;
`;

export interface PopoverContentProps {
  side?: PopoverSide;
  align?: PopoverAlign;
  /** Gap between trigger and content in px. */
  gap?: number;
  /** Match trigger width as min-width. */
  matchTriggerWidth?: boolean;
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

function computePos(
  rect: DOMRect,
  side: PopoverSide,
  align: PopoverAlign,
  gap: number,
  contentEl: HTMLElement | null,
): { top: number; left: number } {
  const cw = contentEl?.offsetWidth ?? 240;
  const ch = contentEl?.offsetHeight ?? 200;

  let top = 0, left = 0;
  switch (side) {
    case 'bottom': top = rect.bottom + gap; break;
    case 'top':    top = rect.top - ch - gap; break;
    case 'left':   left = rect.left - cw - gap; break;
    case 'right':  left = rect.right + gap; break;
  }
  if (side === 'top' || side === 'bottom') {
    if (align === 'start')  left = rect.left;
    if (align === 'center') left = rect.left + rect.width / 2 - cw / 2;
    if (align === 'end')    left = rect.right - cw;
  } else {
    if (align === 'start')  top = rect.top;
    if (align === 'center') top = rect.top + rect.height / 2 - ch / 2;
    if (align === 'end')    top = rect.bottom - ch;
  }

  // Viewport clamp
  const margin = 8;
  left = Math.max(margin, Math.min(left, window.innerWidth - cw - margin));
  top  = Math.max(margin, Math.min(top, window.innerHeight - ch - margin));
  return { top, left };
}

export function PopoverContent({
  side = 'bottom',
  align = 'start',
  gap = 6,
  matchTriggerWidth = false,
  children,
  className,
  style,
}: PopoverContentProps) {
  const { open, setOpen, triggerRef, contentId } = useCtx();
  const contentRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [minWidth, setMinWidth] = useState(0);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;

    const updatePosition = () => {
      if (!triggerRef.current || !contentRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      if (matchTriggerWidth) setMinWidth(rect.width);
      setPos(computePos(rect, side, align, gap, contentRef.current));
    };

    updatePosition();

    // Re-measure position when content size changes (e.g. images load, async data arrives)
    const observer = new ResizeObserver(() => {
      updatePosition();
    });

    if (contentRef.current) observer.observe(contentRef.current);
    if (triggerRef.current) observer.observe(triggerRef.current);

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, side, align, gap, matchTriggerWidth, triggerRef]);

  useOnClickOutside(contentRef, (e) => {
    // Don't close if click was on the trigger itself
    if (triggerRef.current?.contains(e.target as Node)) return;
    setOpen(false);
  }, open);
  useEscapeKey(() => setOpen(false), open);

  if (!open) return null;
  return (
    <Portal>
      <Surface ref={contentRef} id={contentId} role="dialog" $top={pos.top} $left={pos.left} $minWidth={minWidth} className={className} style={style}>
        {children}
      </Surface>
    </Portal>
  );
}
