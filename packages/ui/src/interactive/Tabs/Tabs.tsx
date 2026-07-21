import { createContext, useContext, useId, useRef } from 'react';
import type { ReactNode, KeyboardEvent } from 'react';
import styled, { css } from 'styled-components';
import { useControllableState } from '../../utils/hooks';

interface TabsCtx {
  value: string;
  setValue: (v: string) => void;
  orientation: 'horizontal' | 'vertical';
  variant: TabsVariant;
  baseId: string;
}

const TabsContext = createContext<TabsCtx | null>(null);
function useTabsCtx() {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('Tabs.* components must be inside <Tabs>');
  return ctx;
}

export type TabsVariant = 'underline' | 'pills' | 'segmented';

export interface TabsProps {
  value?: string;
  /** Optional — only needed for uncontrolled tabs. Controlled tabs use `value`. */
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  orientation?: 'horizontal' | 'vertical';
  variant?: TabsVariant;
  children: ReactNode;
  className?: string;
}

const Root = styled.div<{ $orientation: 'horizontal' | 'vertical' }>`
  display: flex;
  flex-direction: ${({ $orientation }) => ($orientation === 'vertical' ? 'row' : 'column')};
  gap: ${({ theme }) => theme.spacing[5]};
  width: 100%;
`;

export function Tabs({
  value,
  defaultValue,
  onValueChange,
  orientation = 'horizontal',
  variant = 'underline',
  children,
  className,
}: TabsProps) {
  const [val, setVal] = useControllableState({ value, defaultValue: defaultValue ?? '', onChange: onValueChange });
  const baseId = useId();
  return (
    <TabsContext.Provider value={{ value: val, setValue: setVal, orientation, variant, baseId }}>
      <Root $orientation={orientation} className={className}>{children}</Root>
    </TabsContext.Provider>
  );
}

/* ── TabsList ────────────────────────────────────────────────────────── */

/* Mobile scroll mixin shared by all variants so tabs never overflow the
   viewport. Invisible scrollbar preserves the clean look. */
const mobileScroll = css`
  @media ${({ theme }) => theme.media.belowSm} {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    &::-webkit-scrollbar { display: none; }
    flex-wrap: nowrap;
    /* Fade hint on right edge so the CA knows there's more */
    -webkit-mask-image: linear-gradient(to right, black calc(100% - 32px), transparent 100%);
    mask-image:         linear-gradient(to right, black calc(100% - 32px), transparent 100%);
  }
`;

const listStyles = {
  underline: css`
    display: flex;
    align-items: center;
    gap: 0;
    border-bottom: 1px solid ${({ theme }) => theme.color.border};
    ${mobileScroll}
  `,
  pills: css`
    display: inline-flex;
    align-items: center;
    gap: ${({ theme }) => theme.spacing[1]};
    ${mobileScroll}
  `,
  segmented: css`
    display: inline-flex;
    align-items: center;
    gap: 2px;
    padding: 4px;
    background: ${({ theme }) => theme.color.muted};
    border-radius: ${({ theme }) => theme.radii.lg};
    ${mobileScroll}
  `,
};

const StyledList = styled.div<{ $variant: TabsVariant }>`
  ${({ $variant }) => listStyles[$variant]}
`;

export function TabsList({ children, className }: { children: ReactNode; className?: string }) {
  const { variant, orientation } = useTabsCtx();
  return <StyledList role="tablist" aria-orientation={orientation} $variant={variant} className={className}>{children}</StyledList>;
}

/* ── TabsTrigger ─────────────────────────────────────────────────────── */

const triggerStyles = {
  underline: css<{ $selected: boolean }>`
    padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[4]}`};
    border: none;
    border-bottom: 2px solid ${({ $selected, theme }) => ($selected ? theme.color.primary : 'transparent')};
    color: ${({ $selected, theme }) => ($selected ? theme.color.primary : theme.color.mutedForeground)};
    font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
    margin-bottom: -1px;
    background: transparent;
    &:hover:not(:disabled) { color: ${({ theme }) => theme.color.foreground}; }
  `,
  pills: css<{ $selected: boolean }>`
    padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[3]}`};
    border-radius: ${({ theme }) => theme.radii.md};
    color: ${({ $selected, theme }) => ($selected ? theme.color.primaryForeground : theme.color.foreground)};
    background: ${({ $selected, theme }) => ($selected ? theme.color.primary : 'transparent')};
    font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
    &:hover:not(:disabled) {
      background: ${({ $selected, theme }) => ($selected ? theme.color.primaryHover : theme.color.muted)};
    }
  `,
  segmented: css<{ $selected: boolean }>`
    padding: ${({ theme }) => `${theme.spacing[1]} ${theme.spacing[4]}`};
    border-radius: ${({ theme }) => theme.radii.md};
    color: ${({ $selected, theme }) => ($selected ? theme.color.foreground : theme.color.mutedForeground)};
    background: ${({ $selected, theme }) => ($selected ? theme.color.card : 'transparent')};
    box-shadow: ${({ $selected, theme }) => ($selected ? theme.shadow.xs : 'none')};
    font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
    font-size: ${({ theme }) => theme.typography.fontSize.base};
    &:hover:not(:disabled) {
      background: ${({ $selected, theme }) => ($selected ? theme.color.card : theme.color.background)};
    }
  `,
};

const StyledTrigger = styled.button<{ $selected: boolean; $variant: TabsVariant }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  font-family: ${({ theme }) => theme.typography.fontFamily.sans};
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  white-space: nowrap;
  cursor: pointer;
  user-select: none;
  outline: none;
  transition: color ${({ theme }) => theme.motion.duration.fast} ${({ theme }) => theme.motion.easing.standard},
              background-color ${({ theme }) => theme.motion.duration.fast} ${({ theme }) => theme.motion.easing.standard},
              border-color ${({ theme }) => theme.motion.duration.fast} ${({ theme }) => theme.motion.easing.standard};

  ${({ $variant }) => triggerStyles[$variant]}

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.ring};
    outline-offset: 2px;
  }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

export interface TabsTriggerProps {
  value: string;
  disabled?: boolean;
  children: ReactNode;
}

export function TabsTrigger({ value, disabled, children }: TabsTriggerProps) {
  const ctx = useTabsCtx();
  const selected = ctx.value === value;
  const listRef = useRef<HTMLButtonElement>(null);
  const handleKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    const list = listRef.current?.parentElement;
    if (!list) return;
    const triggers = Array.from(list.querySelectorAll<HTMLButtonElement>('[role="tab"]:not(:disabled)'));
    const i = triggers.indexOf(listRef.current!);
    if (i < 0) return;
    let next = i;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (i + 1) % triggers.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = i === 0 ? triggers.length - 1 : i - 1;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = triggers.length - 1;
    else return;
    e.preventDefault();
    triggers[next].focus();
    triggers[next].click();
  };
  return (
    <StyledTrigger
      ref={listRef}
      type="button"
      role="tab"
      aria-selected={selected}
      aria-controls={`${ctx.baseId}-panel-${value}`}
      id={`${ctx.baseId}-tab-${value}`}
      tabIndex={selected ? 0 : -1}
      disabled={disabled}
      $selected={selected}
      $variant={ctx.variant}
      onClick={() => ctx.setValue(value)}
      onKeyDown={handleKey}
    >
      {children}
    </StyledTrigger>
  );
}

/* ── TabsContent ─────────────────────────────────────────────────────── */

export interface TabsContentProps {
  value: string;
  children: ReactNode;
  className?: string;
}

export function TabsContent({ value, children, className }: TabsContentProps) {
  const ctx = useTabsCtx();
  if (ctx.value !== value) return null;
  return (
    <div
      role="tabpanel"
      id={`${ctx.baseId}-panel-${value}`}
      aria-labelledby={`${ctx.baseId}-tab-${value}`}
      tabIndex={0}
      className={className}
    >
      {children}
    </div>
  );
}
