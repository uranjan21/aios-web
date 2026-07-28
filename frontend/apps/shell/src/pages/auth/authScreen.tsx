import styled from 'styled-components'
import { focusRing } from '@ledgr/ui'

/** Shared chrome for the standalone auth screens (forgot / reset password).
 *  Deliberately the same card idiom as VerifyEmailPage so the whole
 *  out-of-app auth flow reads as one surface. */

export const Wrap = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing[6]};
  background: ${({ theme }) => theme.color.background};
`

export const Card = styled.div`
  max-width: 400px;
  width: 100%;
  padding: ${({ theme }) => theme.spacing[8]};
  background: ${({ theme }) => theme.color.card};
  border-radius: ${({ theme }) => theme.radii.md};
  box-shadow: ${({ theme }) => theme.elevation[2]};
`

export const Title = styled.h1`
  font-size: ${({ theme }) => theme.typography.fontSize.xl};
  font-weight: 600;
  color: ${({ theme }) => theme.color.foreground};
  margin-bottom: ${({ theme }) => theme.spacing[3]};
`

export const Message = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  color: ${({ theme }) => theme.color.mutedForeground};
  margin-bottom: ${({ theme }) => theme.spacing[6]};
  line-height: 1.55;
`

export const Label = styled.label`
  display: block;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: 500;
  color: ${({ theme }) => theme.color.foreground};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`

export const Field = styled.input`
  width: 100%;
  box-sizing: border-box;
  padding: ${({ theme }) => `${theme.spacing[3]} ${theme.spacing[4]}`};
  margin-bottom: ${({ theme }) => theme.spacing[5]};
  border: 1px solid ${({ theme }) => theme.color.input};
  border-radius: ${({ theme }) => theme.radii.md};
  font: inherit;
  background: ${({ theme }) => theme.color.card};
  color: ${({ theme }) => theme.color.foreground};

  ${focusRing}
`

export const Btn = styled.button`
  width: 100%;
  box-sizing: border-box;
  padding: ${({ theme }) => `${theme.spacing[3]} ${theme.spacing[6]}`};
  background: ${({ theme }) => theme.color.primary};
  color: ${({ theme }) => theme.color.primaryForeground};
  border: none;
  border-radius: ${({ theme }) => theme.radii.md};
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-weight: 500;
  cursor: pointer;

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.color.primaryHover};
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  ${focusRing}
`

export const ErrorBox = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.color.destructive};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`

export const FootLink = styled.div`
  margin-top: ${({ theme }) => theme.spacing[5]};
  text-align: center;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};

  a {
    color: ${({ theme }) => theme.color.mutedForeground};
    text-decoration: underline;
  }
`
