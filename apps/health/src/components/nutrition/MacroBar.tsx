import styled from 'styled-components'

interface MacroBarProps {
  label: string
  current: number
  target: number
  unit?: string
  color: string
}

const StyledMacroBarWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const StyledMacroBarHeader = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
`;

const StyledMacroBarLabel = styled.span`
  font-weight: 500;
  color: ${({ theme }) => theme.color?.foreground || 'var(--foreground)'};
`;

const StyledMacroBarValues = styled.span`
  color: ${({ theme }) => theme.color?.mutedForeground || 'var(--muted-foreground)'};
`;

const StyledMacroBarTrack = styled.div`
  height: 0.5rem;
  background-color: ${({ theme }) => theme.color?.muted || 'var(--muted)'};
  border-radius: ${({ theme }) => theme.radii.sm};
  overflow: hidden;
`;

const StyledMacroBarFill = styled.div<{ $pct: number; $color: string }>`
  height: 100%;
  border-radius: ${({ theme }) => theme.radii.sm};
  transition: width 0.5s ease;
  width: ${({ $pct }) => `${$pct}%`};
  background-color: ${({ $color }) => $color};
`;

export function MacroBar({ label, current, target, unit = 'g', color }: MacroBarProps) {
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0
  return (
    <StyledMacroBarWrapper>
      <StyledMacroBarHeader>
        <StyledMacroBarLabel>{label}</StyledMacroBarLabel>
        <StyledMacroBarValues>{current}{unit} / {target}{unit}</StyledMacroBarValues>
      </StyledMacroBarHeader>
      <StyledMacroBarTrack>
        <StyledMacroBarFill $pct={pct} $color={color} />
      </StyledMacroBarTrack>
    </StyledMacroBarWrapper>
  )
}
