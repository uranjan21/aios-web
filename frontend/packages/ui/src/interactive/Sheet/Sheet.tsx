import { useId, useRef } from 'react';
import type { ReactNode } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { textRole } from '../../theme/mixins';
import { Portal } from '../../utils/Portal';
import { useFocusTrap, useScrollLock, useEscapeKey } from '../../utils/hooks';

export type SheetSide = 'left' | 'right' | 'top' | 'bottom';

export interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  side?: SheetSide;
  /** Pixel/percent size of the perpendicular axis. Default: 360px for left/right, 50% for top/bottom. */
  size?: string;
  title?: ReactNode;
  description?: ReactNode;
  hideCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  children: ReactNode;
}

const fadeIn = keyframes`from { opacity: 0; } to { opacity: 1; }`;

const slideMap = {
  left:   keyframes`from { transform: translateX(-100%); } to { transform: translateX(0); }`,
  right:  keyframes`from { transform: translateX(100%); }  to { transform: translateX(0); }`,
  top:    keyframes`from { transform: translateY(-100%); } to { transform: translateY(0); }`,
  bottom: keyframes`from { transform: translateY(100%); }  to { transform: translateY(0); }`,
};

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: ${({ theme }) => theme.zIndex.overlay};
  background: ${({ theme }) => theme.color.overlay};
  animation: ${fadeIn} ${({ theme }) => theme.motion.duration.normal} ${({ theme }) => theme.motion.easing.enter};
  /* Was a raw blur(2px) — barely a blur, and a different amount from the
     Dialog scrim. Both modal scrims now use the same glass step. */
  backdrop-filter: ${({ theme }) => theme.glass.thin};
  -webkit-backdrop-filter: ${({ theme }) => theme.glass.thin};
`;

const Surface = styled.div<{ $side: SheetSide; $size: string }>`
  position: fixed;
  z-index: ${({ theme }) => theme.zIndex.modal};
  background: ${({ theme }) => theme.color.card};
  color: ${({ theme }) => theme.color.cardForeground};
  /* Was shadow.xl while Dialog used elevation[4] — one scale for modal
     surfaces. The fill stays opaque color.card, unlike the glass Dialog:
     a Sheet is an anchored edge panel that hosts long forms, and page
     content blurring behind a form field is noise, not depth. */
  box-shadow: ${({ theme }) => theme.elevation[4]};
  display: flex;
  flex-direction: column;
  outline: none;
  animation: ${({ $side }) => slideMap[$side]} ${({ theme }) => theme.motion.duration.normal} ${({ theme }) => theme.motion.easing.enter};

  ${({ $side, $size }) => {
    switch ($side) {
      case 'left':   return css`top: 0; left: 0; bottom: 0; width: min(${$size}, 100vw);`;
      case 'right':  return css`top: 0; right: 0; bottom: 0; width: min(${$size}, 100vw);`;
      case 'top':    return css`top: 0; left: 0; right: 0; height: min(${$size}, 100vh);`;
      case 'bottom': return css`bottom: 0; left: 0; right: 0; height: min(${$size}, 100vh);`;
    }
  }}
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

// Was serif — a design-system-level violation of the "no serif in UI" rule,
// which meant every Sheet title rendered in Playfair.
const Title = styled.h2`
  ${textRole('title-s')}
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
  border-radius: ${({ theme }) => theme.radii.sm};
  color: ${({ theme }) => theme.color.mutedForeground};
  background: transparent;
  cursor: pointer;
  &:hover { background: ${({ theme }) => theme.color.muted}; color: ${({ theme }) => theme.color.foreground}; }
  &:focus-visible { outline: 2px solid ${({ theme }) => theme.color.ring}; outline-offset: 2px; }
  & svg { width: 16px; height: 16px; }
`;

function defaultSize(side: SheetSide) {
  return side === 'left' || side === 'right' ? '360px' : '50vh';
}

export function Sheet({
  open,
  onOpenChange,
  side = 'right',
  size,
  title,
  description,
  hideCloseButton = false,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  children,
}: SheetProps) {
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
        $side={side}
        $size={size ?? defaultSize(side)}
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
          <CloseButton onClick={() => onOpenChange(false)} aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </CloseButton>
        )}
      </Surface>
    </Portal>
  );
}
