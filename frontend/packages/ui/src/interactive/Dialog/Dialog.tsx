import { useId, useRef } from 'react';
import type { ReactNode } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { Portal } from '../../utils/Portal';
import { useFocusTrap, useScrollLock, useEscapeKey } from '../../utils/hooks';

export type DialogSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: ReactNode;
  description?: ReactNode;
  /** Icon shown in the header — rendered in a small square container. */
  icon?: ReactNode;
  /** Small uppercase label above the title (eyebrow). */
  eyebrow?: string;
  /** Step labels for a linear stepper. */
  steps?: string[];
  /** Zero-based index of the current step. */
  currentStep?: number;
  size?: DialogSize;
  hideCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  children: ReactNode;
}

const sizeMap: Record<DialogSize, string> = {
  sm:   '440px',
  md:   '560px',
  lg:   '720px',
  xl:   '960px',
  full: '95vw',
};

const fadeIn = keyframes`from { opacity: 0; } to { opacity: 1; }`;
const popIn = keyframes`
  from { opacity: 0; transform: translate(-50%, -50%) scale(0.97); }
  to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
`;

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: ${({ theme }) => theme.zIndex.overlay};
  background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(0, 0, 0, 0.4)' : 'rgba(255, 255, 255, 0.3)'};
  animation: ${fadeIn} ${({ theme }) => theme.motion.duration.normal} ${({ theme }) => theme.motion.easing.enter};
  backdrop-filter: blur(12px) saturate(180%);
  -webkit-backdrop-filter: blur(12px) saturate(180%);
`;

const Surface = styled.div<{ $size: DialogSize }>`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: ${({ theme }) => theme.zIndex.modal};
  width: 92vw;
  max-width: ${({ $size }) => sizeMap[$size]};
  max-height: 88vh;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(20, 24, 34, 0.85)' : 'rgba(255, 255, 255, 0.85)'};
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  color: ${({ theme }) => theme.color.cardForeground};
  border-radius: ${({ theme }) => theme.radii.xl};
  border: 1px solid ${({ theme }) => theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : theme.color.border};
  box-shadow: ${({ theme }) => theme.elevation[4]};
  outline: none;
  overflow: hidden;
  animation: ${popIn} ${({ theme }) => theme.motion.duration.normal} ${({ theme }) => theme.motion.easing.enter};
`;

const Header = styled.div`
  padding: ${({ theme }) => `${theme.spacing[4]} ${theme.spacing[5]} ${theme.spacing[3.5]}`};
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => `${theme.spacing[3]}`};
  position: relative;
`;

const IconWrap = styled.div`
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.color.foreground};
  margin-top: ${({ theme }) => `${theme.spacing[0.5]}`};

  & svg {
    width: 18px;
    height: 18px;
  }
`;

const HeaderText = styled.div`
  flex: 1;
  min-width: 0;
  padding-right: ${({ theme }) => `${theme.spacing[7]}`};
`;



const Title = styled.h2`
  font-family: ${({ theme }) => theme.typography.fontFamily.sans};
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  font-weight: 600;
  line-height: 1.3;
  color: ${({ theme }) => theme.color.foreground};
  margin: 0;
`;

const Description = styled.p`
  margin: ${({ theme }) => `${theme.spacing[1]} 0 0`};
  color: ${({ theme }) => theme.color.mutedForeground};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  line-height: 1.5;
`;

const CloseButton = styled.button`
  position: absolute;
  top: 12px;
  right: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: ${({ theme }) => theme.radii.sm};
  color: ${({ theme }) => theme.color.mutedForeground};
  background: transparent;
  border: none;
  cursor: pointer;
  transition: background-color ${({ theme }) => theme.motion.duration.fast} ${({ theme }) => theme.motion.easing.standard},
              color ${({ theme }) => theme.motion.duration.fast} ${({ theme }) => theme.motion.easing.standard};

  &:hover {
    background: ${({ theme }) => theme.color.muted};
    color: ${({ theme }) => theme.color.foreground};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.ring};
    outline-offset: 2px;
  }
  & svg { width: 14px; height: 14px; }
`;

/* ── Stepper ──────────────────────────────────────────────────────── */

const StepperRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0;
  margin-top: ${({ theme }) => `${theme.spacing[3.5]}`};
`;

const StepNode = styled.div<{ $state: 'done' | 'active' | 'todo' }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => `${theme.spacing[1]}`};
  flex-shrink: 0;
`;

const StepCircle = styled.div<{ $state: 'done' | 'active' | 'todo' }>`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: 700;
  transition: background 200ms, border-color 200ms;

  ${({ $state, theme }) =>
    $state === 'done' ? css`
      background: ${theme.color.accent};
      color: #fff;
      border: 2px solid ${theme.color.accent};
    ` : $state === 'active' ? css`
      background: ${theme.color.card};
      border: 2px solid ${theme.color.accent};
      color: ${theme.color.accent};
    ` : css`
      background: ${theme.color.card};
      border: 2px solid ${theme.color.border};
      color: ${theme.color.mutedForeground};
    `}
`;

const StepLabel = styled.span<{ $state: 'done' | 'active' | 'todo' }>`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ $state }) => $state === 'active' ? '600' : '400'};
  color: ${({ $state, theme }) =>
    $state === 'active' ? theme.color.foreground
    : $state === 'done' ? theme.color.accent
    : theme.color.mutedForeground};
  white-space: nowrap;
`;

const StepConnector = styled.div<{ $done: boolean }>`
  flex: 1;
  height: 2px;
  margin: ${({ theme }) => `0 ${theme.spacing[1.5]}`};
  margin-bottom: ${({ theme }) => `${theme.spacing[3.5]}`};
  background: ${({ $done, theme }) => $done ? theme.color.accent : theme.color.border};
  transition: background 200ms;
`;

/* ── Body ─────────────────────────────────────────────────────────── */

const Body = styled.div`
  padding: ${({ theme }) => `${theme.spacing[5]}`};
  overflow-y: auto;
  flex: 1;
`;

/* ── Component ────────────────────────────────────────────────────── */

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  icon,
  steps,
  currentStep = 0,
  size = 'md',
  hideCloseButton = false,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  children,
}: DialogProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();

  useScrollLock(open);
  useFocusTrap(containerRef, open);
  useEscapeKey(() => onOpenChange(false), open && closeOnEscape);

  if (!open) return null;

  const hasHeader = title || description || icon;

  return (
    <Portal>
      <Overlay onClick={closeOnOverlayClick ? () => onOpenChange(false) : undefined} />
      <Surface
        ref={containerRef}
        $size={size}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        {hasHeader && (
          <Header>
            {icon && <IconWrap>{icon}</IconWrap>}
            <HeaderText>
              {title && <Title id={titleId}>{title}</Title>}
              {description && <Description id={descId}>{description}</Description>}
              {steps && steps.length > 1 && (
                <StepperRow>
                  {steps.map((label, i) => {
                    const state = i < currentStep ? 'done' : i === currentStep ? 'active' : 'todo';
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? '1' : '0 0 auto' }}>
                        <StepNode $state={state}>
                          <StepCircle $state={state}>
                            {i < currentStep ? (
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12 }}>
                                <path d="M20 6L9 17l-5-5" />
                              </svg>
                            ) : i + 1}
                          </StepCircle>
                          <StepLabel $state={state}>{label}</StepLabel>
                        </StepNode>
                        {i < steps.length - 1 && <StepConnector $done={i < currentStep} />}
                      </div>
                    );
                  })}
                </StepperRow>
              )}
            </HeaderText>
            {!hideCloseButton && (
              <CloseButton onClick={() => onOpenChange(false)} aria-label="Close dialog">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </CloseButton>
            )}
          </Header>
        )}
        {!hasHeader && !hideCloseButton && (
          <CloseButton
            onClick={() => onOpenChange(false)}
            aria-label="Close dialog"
            style={{ position: 'absolute', top: 12, right: 12 }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </CloseButton>
        )}
        <Body>{children}</Body>
      </Surface>
    </Portal>
  );
}

export const DialogFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: ${({ theme }) => `${theme.spacing[3]}`};
  padding: ${({ theme }) => `${theme.spacing[4]} ${theme.spacing[5]}`};
  margin: 20px -20px -20px -20px;
  border-top: 1px solid ${({ theme }) => theme.color.border};
  background: ${({ theme }) => theme.color.card};
`;
