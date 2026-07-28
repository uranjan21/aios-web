/**
 * DropdownMenu — built on Popover semantics with menu/menuitem ARIA + keyboard nav.
 */
import { createContext, useContext, useRef, useEffect } from 'react';
import type { ReactNode, MouseEvent, KeyboardEvent } from 'react';
import styled, { css } from 'styled-components';
import { Popover, PopoverTrigger, PopoverContent } from '../Popover/Popover';
import type { PopoverAlign, PopoverSide } from '../Popover/Popover';
import { useControllableState } from '../../utils/hooks';

interface MenuCtx { close: () => void; }
const MenuCtx = createContext<MenuCtx | null>(null);

export interface DropdownMenuProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
}

export function DropdownMenu({ open, defaultOpen = false, onOpenChange, children }: DropdownMenuProps) {
  // Popover owns its own open state; DropdownMenu mirrors it here too so
  // DropdownMenuItem can close the menu on select via MenuCtx (Popover's
  // context is private to Popover.tsx and isn't reachable from here).
  const [isOpen, setIsOpen] = useControllableState({ value: open, defaultValue: defaultOpen, onChange: onOpenChange });
  return (
    <MenuCtx.Provider value={{ close: () => setIsOpen(false) }}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>{children}</Popover>
    </MenuCtx.Provider>
  );
}

export const DropdownMenuTrigger = PopoverTrigger;

export interface DropdownMenuContentProps {
  side?: PopoverSide;
  align?: PopoverAlign;
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const MenuSurface = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 180px;
  padding: ${({ theme }) => theme.spacing[1]};
`;

export function DropdownMenuContent({ side = 'bottom', align = 'start', children, className, style }: DropdownMenuContentProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Roving keyboard nav inside menu
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handleKey = (e: globalThis.KeyboardEvent) => {
      const items = Array.from(el.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not([disabled])'));
      if (!items.length) return;
      const i = items.indexOf(document.activeElement as HTMLButtonElement);
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        items[(i + 1) % items.length].focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        items[i <= 0 ? items.length - 1 : i - 1].focus();
      } else if (e.key === 'Home') {
        e.preventDefault();
        items[0].focus();
      } else if (e.key === 'End') {
        e.preventDefault();
        items[items.length - 1].focus();
      }
    };
    el.addEventListener('keydown', handleKey);
    // Focus first item on mount
    const first = el.querySelector<HTMLButtonElement>('[role="menuitem"]:not([disabled])');
    first?.focus();
    return () => el.removeEventListener('keydown', handleKey);
  }, []);

  return (
    <PopoverContent side={side} align={align} gap={4} className={className} style={style}>
      <MenuSurface ref={ref} role="menu">
        {children}
      </MenuSurface>
    </PopoverContent>
  );
}

const ItemButton = styled.button<{ $destructive: boolean; $disabled: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  width: 100%;
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[3]}`};
  font-family: ${({ theme }) => theme.typography.fontFamily.sans};
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  text-align: left;
  border-radius: ${({ theme }) => theme.radii.md};
  color: ${({ theme, $destructive }) => ($destructive ? theme.color.destructive : theme.color.foreground)};
  background: transparent;
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  opacity: ${({ $disabled }) => ($disabled ? 0.5 : 1)};
  transition: background-color ${({ theme }) => theme.motion.duration.fast} ${({ theme }) => theme.motion.easing.standard};
  outline: none;

  &:hover:not(:disabled), &:focus-visible {
    background: ${({ theme, $destructive }) => $destructive ? theme.color.destructive + '15' : theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)'};
  }

  & > svg { width: 16px; height: 16px; flex-shrink: 0; }
`;

export interface DropdownMenuItemProps {
  onSelect?: () => void;
  destructive?: boolean;
  disabled?: boolean;
  children: ReactNode;
  className?: string;
}

export function DropdownMenuItem({ onSelect, destructive = false, disabled = false, children, className }: DropdownMenuItemProps) {
  const ctx = useContext(MenuCtx);
  const handle = (e: MouseEvent | KeyboardEvent) => {
    if (disabled) return;
    e.preventDefault();
    onSelect?.();
    ctx?.close();
  };
  return (
    <ItemButton
      type="button"
      role="menuitem"
      $destructive={destructive}
      $disabled={disabled}
      disabled={disabled}
      onClick={handle}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handle(e); }}
      className={className}
    >
      {children}
    </ItemButton>
  );
}

export const DropdownMenuSeparator = styled.div`
  height: 1px;
  margin: ${({ theme }) => `${theme.spacing[1]} 0`};
  background: ${({ theme }) => theme.color.border};
`;

export const DropdownMenuLabel = styled.div`
  padding: ${({ theme }) => `${theme.spacing[1]} ${theme.spacing[3]}`};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.color.mutedForeground};
  text-transform: uppercase;
  letter-spacing: ${({ theme }) => theme.typography.letterSpacing.wide};
  ${() => css``}
`;
