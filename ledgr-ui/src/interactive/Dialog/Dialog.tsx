import { useId, useRef } from 'react';
import type { ReactNode } from 'react';
import styled, { keyframes } from 'styled-components';
import { Portal } from '../../utils/Portal';
import { useFocusTrap, useScrollLock, useEscapeKey } from '../../utils/hooks';

export type DialogSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Accessible title — required for screen readers. Pass a string or a custom DialogTitle element. */
  title?: ReactNode;
  description?: ReactNode;
  size?: DialogSize;
  /** Hide the default close button (you'll need your own). */
  hideCloseButton?: boolean;
  /** Prevent close on overlay click. */
  closeOnOverlayClick?: boolean;
  /** Prevent close on Escape. */
  closeOnEscape?: boolean;
  children: ReactNode;
}

const sizeMap: Record<DialogSize, string> = {
  sm:  '420px',
  md:  '560px',
  lg:  '720px',
  xl:  '960px',
  full:'95vw',
};

const fadeIn = keyframes`from { opacity: 0; } to { opacity: 1; }`;
const popIn = keyframes`
  from { opacity: 0; transform: translate(-50%, -50%) scale(0.96); }
  to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
`;

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: ${({ theme }) => theme.zIndex.overlay};
  background: ${({ theme }) => theme.color.overlay};
  animation: ${fadeIn} ${({ theme }) => theme.motion.duration.normal} ${({ theme }) => theme.motion.easing.enter};
  backdrop-filter: blur(2px);
`;

const Surface = styled.div<{ $size: DialogSize }>`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: ${({ theme }) => theme.zIndex.modal};
  width: 90vw;
  max-width: ${({ $size }) => sizeMap[$size]};
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.color.card};
  color: ${({ theme }) => theme.color.cardForeground};
  border-radius: ${({ theme }) => theme.radii.xl};
  box-shadow: ${({ theme }) => theme.shadow.xl};
  outline: none;
  animation: ${popIn} ${({ theme }) => theme.motion.duration.normal} ${({ theme }) => theme.motion.easing.enter};
`;

const Header = styled.div`
  padding: ${({ theme }) => `${theme.spacing[5]} ${theme.spacing[6]} ${theme.spacing[3]}`};
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
`;

const Body = styled.div`
  padding: ${({ theme }) => `${theme.spacing[5]} ${theme.spacing[6]}`};
  overflow-y: auto;
  flex: 1;
`;

const Title = styled.h2`
  font-family: ${({ theme }) => theme.typography.fontFamily.serif};
  font-size: ${({ theme }) => theme.typography.fontSize.xl};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  line-height: ${({ theme }) => theme.typography.lineHeight.tight};
  margin: 0;
`;

const Description = styled.p`
  margin: ${({ theme }) => `${theme.spacing[1]} 0 0`};
  color: ${({ theme }) => theme.color.mutedForeground};
  font-size: ${({ theme }) => theme.typography.fontSize.base};
`;

const CloseButton = styled.button`
  position: absolute;
  top: ${({ theme }) => theme.spacing[3]};
  right: ${({ theme }) => theme.spacing[3]};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: ${({ theme }) => theme.radii.md};
  color: ${({ theme }) => theme.color.mutedForeground};
  background: transparent;
  cursor: pointer;
  transition: background-color ${({ theme }) => theme.motion.duration.fast} ${({ theme }) => theme.motion.easing.standard};

  &:hover { background: ${({ theme }) => theme.color.muted}; color: ${({ theme }) => theme.color.foreground}; }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.ring};
    outline-offset: 2px;
  }
  & svg { width: 16px; height: 16px; }
`;

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
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
        {(title || description) && (
          <Header>
            {title && <Title id={titleId}>{title}</Title>}
            {description && <Description id={descId}>{description}</Description>}
          </Header>
        )}
        <Body>{children}</Body>
        {!hideCloseButton && (
          <CloseButton onClick={() => onOpenChange(false)} aria-label="Close dialog">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </CloseButton>
        )}
      </Surface>
    </Portal>
  );
}

export const DialogFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.spacing[2]};
  padding: ${({ theme }) => `${theme.spacing[3]} ${theme.spacing[6]} ${theme.spacing[5]}`};
  border-top: 1px solid ${({ theme }) => theme.color.border};
`;
