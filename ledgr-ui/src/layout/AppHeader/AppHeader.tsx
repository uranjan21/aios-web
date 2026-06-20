import type { ReactNode } from 'react';
import styled from 'styled-components';

export interface AppHeaderProps {
  /** Left slot — typically breadcrumbs or page title. */
  left?: ReactNode;
  /** Center slot — typically a global search. */
  center?: ReactNode;
  /** Right slot — typically actions + user avatar dropdown. */
  right?: ReactNode;
  className?: string;
}

const Root = styled.header`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  height: 56px;
  padding: 0 ${({ theme }) => theme.spacing[4]};
  background: ${({ theme }) => theme.color.card};
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
  position: sticky;
  top: 0;
  z-index: ${({ theme }) => theme.zIndex.sticky};
  backdrop-filter: blur(8px);
`;

const Slot = styled.div<{ $grow?: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  ${({ $grow }) => $grow && 'flex: 1; min-width: 0;'}
`;

const Right = styled(Slot)`
  margin-left: auto;
`;

export function AppHeader({ left, center, right, className }: AppHeaderProps) {
  return (
    <Root className={className}>
      {left && <Slot $grow={!center}>{left}</Slot>}
      {center && <Slot $grow>{center}</Slot>}
      {right && <Right>{right}</Right>}
    </Root>
  );
}
