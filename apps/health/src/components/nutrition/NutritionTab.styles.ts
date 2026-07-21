import { focusRing } from '@ledgr/ui'
import styled from 'styled-components'

export const StyledContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

export const StyledMacrosWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  align-items: center;

  @media (min-width: 640px) {
    flex-direction: row;
  }
`;

export const StyledMacroBarsContainer = styled.div`
  flex: 1;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;
export const StyledEmptyState = styled.div`
  padding: 2rem;
  text-align: center;
  font-size: 0.875rem;
  color: ${({ theme }) => theme.color?.mutedForeground || 'var(--muted-foreground)'};
`;

export const StyledMealsList = styled.div`
  display: flex;
  flex-direction: column;

  & > div {
    border-bottom: 1px solid rgba(45, 49, 58, 0.15);
  }

  & > div:last-child {
    border-bottom: none;
  }
`;

export const StyledMealItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 20px;
  transition: background-color 0.2s;
  cursor: pointer;

  &:hover {
    background-color: rgba(45, 49, 58, 0.02);
  }

  ${focusRing}
`;

export const StyledMealInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

export const StyledMealIconWrapper = styled.div`
  padding: 0.375rem;
  border-radius: 0.5rem;
  background-color: rgba(248, 209, 104, 0.1);
`;

export const StyledMealName = styled.p`
  font-size: 0.875rem;
  font-weight: 500;
  color: ${({ theme }) => theme.color?.foreground || 'var(--foreground)'};
  margin: 0;
`;

export const StyledMealTime = styled.div`
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 10px;
  color: ${({ theme }) => theme.color?.mutedForeground || 'var(--muted-foreground)'};
  margin-top: 0.125rem;
`;

export const StyledMealType = styled.span`
  text-transform: capitalize;
`;

export const StyledMealStats = styled.div`
  text-align: right;
`;

export const StyledMealCalories = styled.p`
  font-size: 0.875rem;
  font-weight: 700;
  color: ${({ theme }) => theme.color?.foreground || 'var(--foreground)'};
  margin: 0;
`;

export const StyledMealMacros = styled.p`
  font-size: 10px;
  color: ${({ theme }) => theme.color?.mutedForeground || 'var(--muted-foreground)'};
  margin: 0;
`;

export const StyledModalContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

export const StyledQuickAddSection = styled.div`
  margin-bottom: 0.5rem;
`;

export const StyledQuickAddTitle = styled.p`
  font-size: 11px;
  color: ${({ theme }) => theme.color?.mutedForeground || 'var(--muted-foreground)'};
  margin: 0 0 0.375rem 0;
`;

export const StyledQuickAddButtons = styled.div`
  display: flex;
  gap: 0.375rem;
  flex-wrap: wrap;
`;

export const StyledQuickAddButton = styled.button`
  font-size: 11px;
  font-weight: 500;
  padding: 0.25rem 0.5rem;
  border-radius: 0.5rem;
  background-color: ${({ theme }) => theme.color?.muted || 'var(--muted)'};
  color: ${({ theme }) => theme.color?.foreground || 'var(--foreground)'};
  border: 1px solid rgba(45, 49, 58, 0.15);
  transition: background-color 0.2s;
  cursor: pointer;

  &:hover {
    background-color: rgba(45, 49, 58, 0.2);
  }

  ${focusRing}
`;

export const StyledSearchSection = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
`;

export const StyledSearchInputWrapper = styled.div`
  flex: 1;
  position: relative;
`;

export const StyledSearchFeedback = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.color?.mutedForeground || 'var(--muted-foreground)'};
  margin-bottom: 0.5rem;
`;

export const StyledForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

export const StyledFormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

export const StyledLabel = styled.label`
  font-size: 11px;
  color: ${({ theme }) => theme.color?.mutedForeground || 'var(--muted-foreground)'};
  display: block;
`;

export const StyledFormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
`;

// NOTE: unused before this split (never rendered); kept verbatim during de-God.
export const StyledButtonContent = styled.span`
  display: flex;
  align-items: center;
  gap: 0.375rem;
`;
