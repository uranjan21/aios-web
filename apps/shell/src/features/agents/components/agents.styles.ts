import styled, { createGlobalStyle, keyframes } from "styled-components";
import { Card } from "@ledgr/ui";
import { Skeleton } from "@ct/shared/components/ui/skeleton";

export const SpinGlobal = createGlobalStyle`
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
`;

export const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
`;

export const AgentSkeleton = styled(Skeleton)`
  height: 88px;
  border-radius: ${({ theme }) => theme.radii.lg};
`;

export const Stack = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => `${theme.spacing[3]}`};
`;

export const RowDivider = styled.div`
  height: 1px;
  background: color-mix(in srgb, ${({ theme }) => theme.color.border} 30%, transparent);
  margin: ${({ theme }) => `0 ${theme.spacing[5]}`};
`;

export const StatusBadge = styled.span<{ $status: string }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => `${theme.spacing[1.5]}`};
  padding: ${({ theme }) => `${theme.spacing[1]} ${theme.spacing[2.5]}`};
  border-radius: ${({ theme }) => theme.radii.sm};
  border: 1px solid ${({ theme, $status }) =>
    $status === "success"
      ? `color-mix(in srgb, ${theme.color.success} 20%, transparent)`
      : $status === "error"
        ? `color-mix(in srgb, ${theme.color.destructive} 20%, transparent)`
        : $status === "running"
          ? `color-mix(in srgb, ${theme.color.accent} 20%, transparent)`
          : `color-mix(in srgb, ${theme.color.mutedForeground} 15%, transparent)`};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: 600;
  background: ${({ theme, $status }) =>
    $status === "success"
      ? `color-mix(in srgb, ${theme.color.success} 8%, transparent)`
      : $status === "error"
        ? `color-mix(in srgb, ${theme.color.destructive} 8%, transparent)`
        : $status === "running"
          ? `color-mix(in srgb, ${theme.color.accent} 10%, transparent)`
          : `color-mix(in srgb, ${theme.color.mutedForeground} 6%, transparent)`};
  color: ${({ theme, $status }) =>
    $status === "success"
      ? theme.color.success
      : $status === "error"
        ? theme.color.destructive
        : $status === "running"
          ? theme.color.accent
          : theme.color.mutedForeground};
  text-transform: capitalize;
`;

export const Cell = styled.div<{ $alignRight?: boolean }>`
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => `${theme.spacing[0.5]}`};

  @media ${({ theme }) => theme.media.lg} {
    ${({ $alignRight }) => $alignRight && `
      align-items: flex-end;
      text-align: right;
    `}
  }
`;

export const MobileLabel = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => `${theme.spacing[1.5]}`};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.color.mutedForeground};

  @media ${({ theme }) => theme.media.lg} {
    display: none;
  }
`;

export const Value = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: 600;
  color: ${({ theme }) => theme.color.foreground};
`;

export const SubValue = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.color.mutedForeground};
`;

export const RosterCard = styled(Card)`
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radii.md};
  box-shadow: none;

  h2 {
    font-size: ${({ theme }) => theme.typography.fontSize.lg};
    font-weight: 600;
    color: ${({ theme }) => theme.color.foreground};
  }

  p {
    font-size: ${({ theme }) => theme.typography.fontSize.sm};
    color: ${({ theme }) => theme.color.mutedForeground};
    margin-top: ${({ theme }) => `${theme.spacing[1]}`};
  }
`;
