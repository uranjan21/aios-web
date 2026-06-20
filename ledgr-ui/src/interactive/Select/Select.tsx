/**
 * Select — accessible single-value dropdown.
 *
 * Designed to mirror native <select> behaviour while remaining themable:
 * - Pass an `options` array of { value, label, icon?, disabled? }
 *   OR pass children as <SelectItem> for full control of row rendering.
 * - `value` + `onChange` are controlled.
 * - Keyboard: Space/Enter to open, Arrow keys to navigate, type-ahead first char, Esc to close.
 */
import { createContext, useContext, useId, useMemo, useRef, useState, useEffect, useLayoutEffect } from 'react';
import type { ReactNode } from 'react';
import styled, { keyframes } from 'styled-components';
import { Portal } from '../../utils/Portal';
import { useOnClickOutside, useEscapeKey } from '../../utils/hooks';
import { focusRing } from '../../utils/focusRing';

export interface SelectOption {
  value: string | number;
  label: ReactNode;
  /** Plain text used for type-ahead + screen reader. Falls back to label if it's a string. */
  textValue?: string;
  icon?: ReactNode;
  disabled?: boolean;
}

export type SelectSize = 'sm' | 'md' | 'lg';

export interface SelectProps {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string | number) => void;
  options?: SelectOption[];
  placeholder?: string;
  size?: SelectSize;
  invalid?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  /** Accessible label when no visible label is associated. */
  'aria-label'?: string;
  /** ID linking a visible <Label htmlFor>. */
  id?: string;
  /** Custom trigger renderer — receives the selected option. */
  renderValue?: (selected: SelectOption | undefined) => ReactNode;
  children?: ReactNode;
}

interface SelectCtx {
  value: string | number | undefined;
  setValue: (v: string) => void;
  close: () => void;
}
const Ctx = createContext<SelectCtx | null>(null);

/* ── Styled atoms ────────────────────────────────────────────────────── */

const sizeStyles = {
  sm: { h: '32px', font: '0.75rem',  pad: '0 8px' },
  md: { h: '36px', font: '0.875rem', pad: '0 12px' },
  lg: { h: '44px', font: '1rem',     pad: '0 14px' },
};

const Trigger = styled.button<{ $size: SelectSize; $invalid: boolean; $fullWidth: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing[2]};
  ${({ $size }) => `
    height: ${sizeStyles[$size].h};
    font-size: ${sizeStyles[$size].font};
    padding: ${sizeStyles[$size].pad};
  `}
  width: ${({ $fullWidth }) => ($fullWidth ? '100%' : 'auto')};
  font-family: ${({ theme }) => theme.typography.fontFamily.sans};
  color: ${({ theme }) => theme.color.foreground};
  background: ${({ theme }) => theme.color.card};
  border: 1px solid ${({ theme, $invalid }) => ($invalid ? theme.color.destructive : theme.color.input)};
  border-radius: ${({ theme }) => theme.radii.md};
  cursor: pointer;
  text-align: left;
  white-space: nowrap;
  transition: border-color ${({ theme }) => theme.motion.duration.fast} ${({ theme }) => theme.motion.easing.standard};
  ${focusRing}

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    background: ${({ theme }) => theme.color.muted};
  }

  & svg { width: 14px; height: 14px; flex-shrink: 0; color: ${({ theme }) => theme.color.mutedForeground}; }
`;

const Placeholder = styled.span`
  color: ${({ theme }) => theme.color.mutedForeground};
`;

const Value = styled.span`
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const popIn = keyframes`
  from { opacity: 0; transform: translateY(-2px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
`;

const Surface = styled.div<{ $top: number; $left: number; $width: number }>`
  position: fixed;
  top: ${({ $top }) => `${$top}px`};
  left: ${({ $left }) => `${$left}px`};
  min-width: ${({ $width }) => `${$width}px`};
  max-height: 280px;
  overflow-y: auto;
  z-index: ${({ theme }) => theme.zIndex.popover};
  background: ${({ theme }) => theme.color.popover};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radii.md};
  box-shadow: ${({ theme }) => theme.shadow.lg};
  padding: ${({ theme }) => theme.spacing[1]};
  animation: ${popIn} ${({ theme }) => theme.motion.duration.fast} ${({ theme }) => theme.motion.easing.enter};
  outline: none;
`;

const Item = styled.button<{ $selected: boolean; $disabled: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  width: 100%;
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[3]}`};
  font-family: ${({ theme }) => theme.typography.fontFamily.sans};
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  text-align: left;
  background: ${({ $selected, theme }) => ($selected ? theme.color.primary + '15' : 'transparent')};
  color: ${({ theme }) => theme.color.foreground};
  border-radius: ${({ theme }) => theme.radii.sm};
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  opacity: ${({ $disabled }) => ($disabled ? 0.5 : 1)};
  outline: none;
  transition: background-color ${({ theme }) => theme.motion.duration.fast} ${({ theme }) => theme.motion.easing.standard};

  &:hover:not(:disabled), &:focus-visible {
    background: ${({ theme }) => theme.color.muted};
  }

  & > svg { width: 14px; height: 14px; flex-shrink: 0; }
`;

const CheckMark = styled.span`
  margin-left: auto;
  color: ${({ theme }) => theme.color.primary};
  & svg { width: 14px; height: 14px; }
`;

/* ── Component ───────────────────────────────────────────────────────── */

export function Select({
  value,
  defaultValue,
  onChange,
  options,
  placeholder = 'Select…',
  size = 'md',
  invalid = false,
  disabled = false,
  fullWidth = true,
  'aria-label': ariaLabel,
  id,
  renderValue,
  children,
}: SelectProps) {
  const isControlled = value !== undefined;
  const [internal, setInternal] = useState<string | undefined>(defaultValue);
  const current = isControlled ? value : internal;

  const set = (v: string) => {
    if (!isControlled) setInternal(v);
    onChange?.(v);
  };

  const triggerRef = useRef<HTMLButtonElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  // start off-screen so no flash before positioning effect runs
  const [pos, setPos] = useState<{ top: number; left: number; width: number }>({ top: -9999, left: -9999, width: 0 });
  const listboxId = useId();

  // Resolve selected option from prop options
  const selectedOption = useMemo(
    () => options?.find(o => o.value === current),
    [options, current],
  );

  // Position the surface after it's been committed to the DOM
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const trigger = triggerRef.current;
    const rect = trigger.getBoundingClientRect();

    // surfaceRef is populated because Portal commits in the same React batch
    const actualH = surfaceRef.current?.offsetHeight ?? 280;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    const top = spaceBelow < actualH + 8 && spaceAbove >= actualH + 8
      ? rect.top - actualH - 4   // flip above trigger
      : rect.bottom + 4;          // default: below trigger

    setPos({ top, left: rect.left, width: rect.width });
  }, [open]); // only re-run when open changes

  // reset pos when closed so next open starts off-screen
  useLayoutEffect(() => {
    if (!open) setPos({ top: -9999, left: -9999, width: 0 });
  }, [open]);

  useOnClickOutside(surfaceRef, (e) => {
    if (triggerRef.current?.contains(e.target as Node)) return;
    setOpen(false);
  }, open);
  useEscapeKey(() => { setOpen(false); triggerRef.current?.focus(); }, open);

  // Keyboard nav inside open listbox
  useEffect(() => {
    if (!open) return;
    const el = surfaceRef.current;
    if (!el) return;
    const handleKey = (e: KeyboardEvent) => {
      const items = Array.from(el.querySelectorAll<HTMLButtonElement>('[role="option"]:not([disabled])'));
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
      } else if (e.key === 'Tab') {
        // Trap focus inside the listbox while open
        e.preventDefault();
      } else if (/^[a-z0-9]$/i.test(e.key)) {
        // Type-ahead
        const match = items.find(it => {
          const txt = (it.textContent ?? '').trim().toLowerCase();
          return txt.startsWith(e.key.toLowerCase());
        });
        match?.focus();
      }
    };
    el.addEventListener('keydown', handleKey);
    // Focus the selected option, or the first
    const selected = el.querySelector<HTMLButtonElement>('[role="option"][data-selected="true"]');
    const first = el.querySelector<HTMLButtonElement>('[role="option"]:not([disabled])');
    (selected ?? first)?.focus();
    return () => el.removeEventListener('keydown', handleKey);
  }, [open]);

  const handleTriggerKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setOpen(true);
    }
  };

  const handleSelect = (v: string) => {
    set(v);
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  };

  return (
    <Ctx.Provider value={{ value: current, setValue: handleSelect, close: () => setOpen(false) }}>
      <Trigger
        ref={triggerRef}
        type="button"
        id={id}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        disabled={disabled}
        $size={size}
        $invalid={invalid}
        $fullWidth={fullWidth}
        onClick={() => setOpen(o => !o)}
        onKeyDown={handleTriggerKey}
      >
        <Value>
          {renderValue
            ? renderValue(selectedOption)
            : selectedOption
              ? (<>{selectedOption.icon}{selectedOption.label}</>)
              : <Placeholder>{placeholder}</Placeholder>}
        </Value>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </Trigger>

      {open && (
        <Portal>
          <Surface
            ref={surfaceRef}
            id={listboxId}
            role="listbox"
            aria-activedescendant={current}
            $top={pos.top}
            $left={pos.left}
            $width={pos.width}
          >
            {options
              ? options.map(opt => (
                  <SelectItem key={opt.value} value={opt.value} disabled={opt.disabled}>
                    {opt.icon}
                    <span>{opt.label}</span>
                  </SelectItem>
                ))
              : children}
          </Surface>
        </Portal>
      )}
    </Ctx.Provider>
  );
}

/* ── SelectItem (for children-style API) ─────────────────────────────── */

export interface SelectItemProps {
  value: string | number;
  disabled?: boolean;
  children: ReactNode;
}

export function SelectItem({ value, disabled = false, children }: SelectItemProps) {
  const ctx = useContext(Ctx);
  if (!ctx) return null;
  const selected = ctx.value === value;
  return (
    <Item
      type="button"
      role="option"
      aria-selected={selected}
      data-selected={selected || undefined}
      disabled={disabled}
      $selected={selected}
      $disabled={disabled}
      onClick={() => ctx.setValue(String(value))}
    >
      {children}
      {selected && (
        <CheckMark aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12.5l5 5L20 7" />
          </svg>
        </CheckMark>
      )}
    </Item>
  );
}
