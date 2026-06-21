import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import styled, { keyframes } from 'styled-components'
import { api } from '@/api/client'
import { useAuthStore } from '@/stores/authStore'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'

const spin = keyframes`
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
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
  max-width: 360px;
  padding: 40px 32px;
  border-radius: 18px;
  background: ${({ theme }) => theme.color.card};
  border: 1px solid ${({ theme }) => theme.color.border};
  box-shadow: ${({ theme }) => theme.shadow.lg};
`

const Spinner = styled(Loader2)`
  animation: ${spin} 1s linear infinite;
  color: ${({ theme }) => theme.color.primary};
`

const Title = styled.h2`
  font-family: ${({ theme }) => theme.typography.fontFamily.sans};
  font-size: 18px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.foreground};
  margin: 16px 0 8px;
`

const Detail = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.color.mutedForeground};
  margin: 0;
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
  }, [])

  return (
    <Root>
      <Card>
        {status === 'loading' && (
          <>
            <Spinner size={36} />
            <Title>Signing you in...</Title>
            <Detail>Verifying your Google account</Detail>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle2 size={36} color="var(--color-primary, #1C1917)" />
            <Title>Welcome back</Title>
            <Detail>Redirecting to dashboard...</Detail>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle size={36} color="var(--color-destructive, #dc2626)" />
            <Title>Sign-in failed</Title>
            <Detail>{errorMsg}</Detail>
          </>
        )}
      </Card>
    </Root>
  )
}
