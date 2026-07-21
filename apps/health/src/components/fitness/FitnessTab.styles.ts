import styled from 'styled-components'

export const StyledContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

export const StyledSectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
`;

export const StyledSectionTitle = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.color?.mutedForeground || 'var(--muted-foreground)'};
`;

export const StyledBadgesWrapper = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

export const StyledListWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

export const StyledPrHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
`;

export const StyledPrTitle = styled.h2`
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.025em;
  color: ${({ theme }) => theme.color?.mutedForeground || 'var(--muted-foreground)'};
  margin: 0;
`;

export const StyledHabitsStatsLabel = styled.p`
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.025em;
  color: ${({ theme }) => theme.color?.mutedForeground || 'var(--muted-foreground)'};
  margin: 0;
`;

export const StyledHabitsStatsValue = styled.p`
  font-size: 12px;
  font-weight: 500;
  color: ${({ theme }) => theme.color?.foreground || 'var(--foreground)'};
  letter-spacing: -0.01em;
  margin: 0.125rem 0 0 0;
`;

export const StyledWorkoutsHeader = styled.p`
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.color?.mutedForeground || 'var(--muted-foreground)'};
  text-transform: uppercase;
  letter-spacing: 0.025em;
  margin: 0 0 0.5rem 0;
`;

export const StyledModalContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

export const StyledSegmentedControlWrapper = styled.div`
  margin-bottom: 0.5rem;
  width: 100%;
  display: flex;
  & > * {
    flex: 1;
    display: flex;
  }
  & > * > button {
    flex: 1;
  }
`;

export const StyledFormWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

export const StyledSetsWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
`;

export const StyledSetRow = styled.div`
  display: flex;
  gap: 0.375rem;
  align-items: center;
`;

export const StyledExerciseInputWrapper = styled.div`
  flex: 1;
  position: relative;
`;

export const StyledFormActions = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 0.5rem;
`;

export const StyledHabitFormRow = styled.div`
  display: flex;
  gap: 0.375rem;
`;

export const StyledButtonContent = styled.span`
  display: flex;
  align-items: center;
  gap: 0.375rem;
`;

export const StyledDivider = styled.div`
  width: 1px;
  height: 1rem;
  background-color: ${({ theme }) => theme.color?.border || 'var(--border)'};
  margin: 0 0.25rem;
  opacity: 0.6;

  @media ${({ theme }) => theme.media.belowMd} {
    display: none;
  }
`;
