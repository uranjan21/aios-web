import { createContext, useContext, useId, useRef, useState, useLayoutEffect, cloneElement, isValidElement } from 'react';
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
  return cloneElement(children as ReactElement<Record<string, unknown>>, {
    ref: (node: HTMLElement | null) => {
      triggerRef.current = node;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const orig = (children as any).ref;
      if (typeof orig === 'function') orig(node);
      else if (orig && typeof orig === 'object') orig.current = node;
    },
    onClick: (e: unknown) => { setOpen(!open); childProps.onClick?.(e); },
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
  z-index: ${({ theme }) => theme.zIndex.popover};
  min-width: ${({ $minWidth }) => `${$minWidth}px`};
  background: ${({ theme }) => theme.color.popover};
  color: ${({ theme }) => theme.color.popoverForeground};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  box-shadow: ${({ theme }) => theme.shadow.lg};
  padding: ${({ theme }) => theme.spacing[3]};
  outline: none;
  transform-origin: top left;
  animation: ${popIn} ${({ theme }) => theme.motion.duration.fast} ${({ theme }) => theme.motion.easing.enter};
`;

export interface PopoverContentProps {
  side?: PopoverSide;
  align?: PopoverAlign;
  /** Gap between trigger and content in px. */
  gap?: number;
  /** Match trigger width as min-width. */
  matchTriggerWidth?: boolean;
  children: ReactNode;
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
}: PopoverContentProps) {
  const { open, setOpen, triggerRef, contentId } = useCtx();
  const contentRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [minWidth, setMinWidth] = useState(0);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setMinWidth(matchTriggerWidth ? rect.width : 0);
    // Compute after paint so content is measured
    const id = requestAnimationFrame(() => {
      setPos(computePos(rect, side, align, gap, contentRef.current));
    });
    return () => cancelAnimationFrame(id);
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
      <Surface ref={contentRef} id={contentId} role="dialog" $top={pos.top} $left={pos.left} $minWidth={minWidth}>
        {children}
      </Surface>
    </Portal>
  );
}
