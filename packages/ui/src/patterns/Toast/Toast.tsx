/**
 * Toast — fire-and-forget notifications.
 *
 * Usage: mount <Toaster /> once near the app root. Anywhere call:
 *   toast.success('Saved')
 *   toast.error('Failed')
 *   toast('Something happened', { description: 'Details', duration: 6000 })
 */
import { useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import styled, { keyframes } from 'styled-components';
import { Portal } from '../../utils/Portal';

export type ToastTone = 'default' | 'success' | 'warning' | 'destructive' | 'info';

export interface ToastOptions {
  description?: ReactNode;
  duration?: number;
  tone?: ToastTone;
  action?: { label: string; onClick: () => void };
}

interface ToastEntry extends ToastOptions {
  id: number;
  message: ReactNode;
  tone: ToastTone;
  duration: number;
}

type Listener = (toasts: ToastEntry[]) => void;
const listeners = new Set<Listener>();
let store: ToastEntry[] = [];
let nextId = 1;

function emit() { listeners.forEach(l => l(store)); }

function push(message: ReactNode, opts: ToastOptions = {}): number {
  const entry: ToastEntry = {
    id: nextId++,
    message,
    tone: opts.tone ?? 'default',
    duration: opts.duration ?? 4000,
    description: opts.description,
    action: opts.action,
  };
  store = [...store, entry];
  emit();
  return entry.id;
}

function dismiss(id: number) {
  store = store.filter(t => t.id !== id);
  emit();
}

export const toast = Object.assign(
  (message: ReactNode, opts?: ToastOptions) => push(message, opts),
  {
    success:     (message: ReactNode, opts?: ToastOptions) => push(message, { ...opts, tone: 'success' }),
    error:       (message: ReactNode, opts?: ToastOptions) => push(message, { ...opts, tone: 'destructive' }),
    warning:     (message: ReactNode, opts?: ToastOptions) => push(message, { ...opts, tone: 'warning' }),
    info:        (message: ReactNode, opts?: ToastOptions) => push(message, { ...opts, tone: 'info' }),
    dismiss,
  },
);

/* ── Tone config ────────────────────────────────────────────────────── */

const TONE_ICON: Record<ToastTone, ReactNode> = {
  success:     <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd"/></svg>,
  destructive: <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd"/></svg>,
  warning:     <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd"/></svg>,
  info:        <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z" clipRule="evenodd"/></svg>,
  default:     <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z" clipRule="evenodd"/></svg>,
};

/* ── Animations ─────────────────────────────────────────────────────── */

const slideIn = keyframes`
  from { opacity: 0; transform: translateY(12px) scale(0.96); }
  to   { opacity: 1; transform: translateY(0)    scale(1); }
`;
const slideOut = keyframes`
  from { opacity: 1; transform: translateY(0)    scale(1); }
  to   { opacity: 0; transform: translateY(8px)  scale(0.96); }
`;

/* ── Layout ─────────────────────────────────────────────────────────── */

const ToastStack = styled.div`
  position: fixed;
  bottom: ${({ theme }) => theme.spacing[5]};
  right: ${({ theme }) => theme.spacing[5]};
  z-index: ${({ theme }) => theme.zIndex.toast};
  display: flex;
  flex-direction: column-reverse;
  gap: ${({ theme }) => theme.spacing[2]};
  max-width: 360px;
  width: calc(100vw - ${({ theme }) => theme.spacing[10]});
  pointer-events: none;
`;

/* Borderless floating card — tone expressed via icon colour + subtle bg tint only. */
const Card = styled.div<{ $tone: ToastTone; $closing: boolean }>`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing[3]};
  background: ${({ theme }) => theme.color.card};
  color: ${({ theme }) => theme.color.foreground};
  border: none;
  border-radius: ${({ theme }) => theme.radii.xl};
  box-shadow: ${({ theme }) => theme.shadow.xl},
              0 0 0 1px rgba(0,0,0,0.04);
  padding: ${({ theme }) => `${theme.spacing[3]} ${theme.spacing[4]}`};
  pointer-events: auto;
  animation: ${({ $closing }) => $closing ? slideOut : slideIn} 220ms cubic-bezier(0.16,1,0.3,1) forwards;
`;

const IconWrap = styled.span<{ $tone: ToastTone }>`
  flex-shrink: 0;
  margin-top: 1px;
  display: inline-flex;
  width: 18px;
  height: 18px;
  color: ${({ theme, $tone }) => {
    const map: Record<ToastTone, string> = {
      success:     theme.color.success,
      destructive: theme.color.destructive,
      warning:     theme.color.warning,
      info:        theme.color.info,
      default:     theme.color.primary,
    };
    return map[$tone];
  }};
  & svg { width: 18px; height: 18px; }
`;

const Message = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`;

const Title = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  margin: 0;
  line-height: 1.4;
`;

const Description = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.color.mutedForeground};
  margin: 0;
  line-height: 1.4;
`;

const ActionBtn = styled.button`
  flex-shrink: 0;
  align-self: center;
  background: transparent;
  border: none;
  padding: 0;
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.color.primary};
  cursor: pointer;
  &:hover { text-decoration: underline; }
`;

const CloseBtn = styled.button`
  flex-shrink: 0;
  align-self: flex-start;
  margin-top: 1px;
  background: transparent;
  border: none;
  color: ${({ theme }) => theme.color.mutedForeground};
  cursor: pointer;
  padding: 2px;
  border-radius: ${({ theme }) => theme.radii.sm};
  opacity: 0.6;
  transition: opacity 120ms ease, background 120ms ease;
  &:hover { background: ${({ theme }) => theme.color.muted}; opacity: 1; }
  & svg { width: 13px; height: 13px; display: block; }
`;

function ToastItem({ entry, onClose }: { entry: ToastEntry; onClose: () => void }) {
  const [closing, setClosing] = useState(false);
  const close = useCallback(() => {
    setClosing(true);
    window.setTimeout(onClose, 220);
  }, [onClose]);
  useEffect(() => {
    const t = window.setTimeout(close, entry.duration);
    return () => window.clearTimeout(t);
  }, [entry.duration, close]);
  return (
    <Card $tone={entry.tone} $closing={closing} role="status" aria-live="polite">
      <IconWrap $tone={entry.tone}>{TONE_ICON[entry.tone]}</IconWrap>
      <Message>
        <Title>{entry.message}</Title>
        {entry.description && <Description>{entry.description}</Description>}
      </Message>
      {entry.action && (
        <ActionBtn onClick={() => { entry.action!.onClick(); close(); }}>
          {entry.action.label}
        </ActionBtn>
      )}
      <CloseBtn onClick={close} aria-label="Dismiss notification">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </CloseBtn>
    </Card>
  );
}

export function Toaster() {
  const [toasts, setToasts] = useState<ToastEntry[]>(store);
  useEffect(() => {
    const l: Listener = (t) => setToasts(t);
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);
  return (
    <Portal>
      <ToastStack aria-live="polite" aria-relevant="additions">
        {toasts.map(t => (
          <ToastItem key={t.id} entry={t} onClose={() => dismiss(t.id)} />
        ))}
      </ToastStack>
    </Portal>
  );
}
