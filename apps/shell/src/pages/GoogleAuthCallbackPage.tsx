import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import styled, { keyframes, css } from 'styled-components'
import { api } from '@aios/shared/api/client'
import { useAuthStore } from '@aios/shared/stores/authStore'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'

const spin = keyframes`
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
`

const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`

const scaleIn = keyframes`
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
`

const Root = styled.div`
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => theme.color.background};
  padding: 24px;
`

const Card = styled.div`
  text-align: center;
  width: 100%;
  max-width: 380px;
  padding: 48px 40px;
  border-radius: 16px;
  background: ${({ theme }) => theme.color.card};
  border: 1px solid ${({ theme }) => theme.color.border};
  box-shadow: 0 8px 32px -8px rgba(0, 0, 0, 0.08);
  animation: ${fadeInUp} 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  will-change: transform, opacity;
`

const IconWrapper = styled.div<{ $status: 'loading' | 'success' | 'error' }>`
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 24px;
  
  background: ${({ theme, $status }) => 
    $status === 'success' ? 'rgba(34, 197, 94, 0.12)' : 
    $status === 'error' ? 'rgba(239, 68, 68, 0.12)' : 
    'rgba(128, 128, 128, 0.12)'};
    
  color: ${({ theme, $status }) => 
    $status === 'success' ? '#22c55e' : 
    $status === 'error' ? '#ef4444' : 
    theme.color.primary};

  animation: ${scaleIn} 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;

  svg {
    ${({ $status }) => $status === 'loading' ? css`animation: ${spin} 1.2s linear infinite;` : 'animation: none;'}
  }
`

const Title = styled.h2`
  font-family: ${({ theme }) => theme.typography.fontFamily.sans};
  font-size: 20px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.foreground};
  margin: 0 0 12px;
  letter-spacing: -0.01em;
`

const Detail = styled.p`
  font-family: ${({ theme }) => theme.typography.fontFamily.sans};
  font-size: 15px;
  color: ${({ theme }) => theme.color.mutedForeground};
  margin: 0;
  line-height: 1.5;
`

const ContentWrapper = styled.div`
  animation: ${fadeInUp} 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
`

export function GoogleAuthCallbackPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const setAuthenticated = useAuthStore(s => s.setAuthenticated)
  const setUser = useAuthStore(s => s.setUser)
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    if (error) {
      setStatus('error')
      setErrorMsg(error === 'access_denied' ? 'Access was denied' : error)
      return
    }

    if (!code || !state) {
      setStatus('error')
      setErrorMsg('Missing authorization code')
      return
    }

    api.post('/auth/google/callback', { code, state })
      .then(({ data }) => {
        setStatus('success')
        setAuthenticated(true)
        if (data.user) setUser(data.user)
        setTimeout(() => navigate('/app'), 1500)
      })
      .catch((err) => {
        setStatus('error')
        setErrorMsg(err.response?.data?.detail || 'Authentication failed')
      })
  }, [navigate, searchParams, setAuthenticated, setUser])

  return (
    <Root>
      <Card>
        <ContentWrapper key={status}>
          <IconWrapper $status={status}>
            {status === 'loading' && <Loader2 size={32} strokeWidth={2.5} />}
            {status === 'success' && <CheckCircle2 size={32} strokeWidth={2.5} />}
            {status === 'error' && <XCircle size={32} strokeWidth={2.5} />}
          </IconWrapper>
          
          <Title>
            {status === 'loading' && 'Signing you in'}
            {status === 'success' && 'Welcome back'}
            {status === 'error' && 'Sign-in failed'}
          </Title>
          
          <Detail>
            {status === 'loading' && 'Verifying your Google account...'}
            {status === 'success' && 'Redirecting to your dashboard...'}
            {status === 'error' && errorMsg}
          </Detail>
        </ContentWrapper>
      </Card>
    </Root>
  )
}
