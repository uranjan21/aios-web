import { Component, type ReactNode } from 'react'
import { AlertCircle } from 'lucide-react'
import styled from 'styled-components'

const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 16px;
  padding: 32px;
  text-align: center;
`

const StyledAlertIcon = styled(AlertCircle)`
  width: 2.5rem;
  height: 2.5rem;
  color: ${({ theme }) => theme.color?.destructive || 'var(--destructive)'};
`

const ErrorTitle = styled.p`
  font-weight: 600;
  color: ${({ theme }) => theme.color?.foreground || 'var(--foreground)'};
  margin: 0;
`

const ErrorDescription = styled.p`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.color?.mutedForeground || 'var(--muted-foreground)'};
  margin-top: 0.25rem;
  margin-bottom: 0;
`

const ReloadButton = styled.button`
  font-size: 0.875rem;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  background-color: ${({ theme }) => theme.color?.primary || 'var(--primary)'};
  color: ${({ theme }) => theme.color?.primaryForeground || 'var(--primary-foreground)'};
  border: none;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    opacity: 0.9;
  }

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px ${({ theme }) => theme.color?.primary || 'var(--primary)'};
  }
`

interface State { hasError: boolean }

export class RouteErrorBoundary extends Component<{ children?: ReactNode }, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error) {
    console.error('[RouteErrorBoundary]', error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorContainer>
          <StyledAlertIcon />
          <div>
            <ErrorTitle>Something went wrong</ErrorTitle>
            <ErrorDescription>This page crashed. Reload to recover.</ErrorDescription>
          </div>
          <ReloadButton onClick={() => window.location.reload()}>
            Reload
          </ReloadButton>
        </ErrorContainer>
      )
    }
    return this.props.children
  }
}
