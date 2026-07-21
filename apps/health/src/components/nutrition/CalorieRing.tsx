import styled from 'styled-components'

interface CalorieRingProps {
  calories: number
  target: number
}

const StyledCalorieRingWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
`;

const StyledCalorieRingSvgWrapper = styled.div`
  position: relative;
`;

const StyledCalorieRingSvg = styled.svg`
  transform: rotate(-90deg);
`;

const StyledCalorieRingTextWrapper = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`;

const StyledCalorieRingValue = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: 500;
  color: ${({ theme }) => theme.color?.foreground || 'var(--foreground)'};
`;

const StyledCalorieRingUnit = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.color?.mutedForeground || 'var(--muted-foreground)'};
`;

const StyledCalorieRingSubtitle = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.color?.mutedForeground || 'var(--muted-foreground)'};
  margin: 0;
`;

export function CalorieRing({ calories, target }: CalorieRingProps) {
  const pct = target > 0 ? Math.min(100, (calories / target) * 100) : 0
  const size = 120
  const stroke = 10
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ

  return (
    <StyledCalorieRingWrapper>
      <StyledCalorieRingSvgWrapper style={{ width: size, height: size }}>
        <StyledCalorieRingSvg width={size} height={size}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--muted)" strokeWidth={stroke} />
          <circle
            cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke="#F8D168" strokeWidth={stroke}
            strokeDasharray={circ} strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.5s ease' }}
          />
        </StyledCalorieRingSvg>
        <StyledCalorieRingTextWrapper>
          <StyledCalorieRingValue>{calories}</StyledCalorieRingValue>
          <StyledCalorieRingUnit>kcal</StyledCalorieRingUnit>
        </StyledCalorieRingTextWrapper>
      </StyledCalorieRingSvgWrapper>
      <StyledCalorieRingSubtitle>Target: {target} kcal · {Math.round(pct)}% reached</StyledCalorieRingSubtitle>
    </StyledCalorieRingWrapper>
  )
}
