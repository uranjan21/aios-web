import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import styled, { keyframes, css } from 'styled-components'
import { api } from '@ct/shared/api/client'
import { useAuthStore } from '@ct/shared/stores/authStore'
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
  padding: ${({ theme }) => `${theme.spacing[6]}`};
`

const Card = styled.div`
  text-align: center;
  width: 100%;
  max-width: 380px;
  padding: ${({ theme }) => `${theme.spacing[12]} ${theme.spacing[10]}`};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.color.card};
  border: 1px solid ${({ theme }) => theme.color.border};
  box-shadow: ${({ theme }) => theme.elevation[3]};
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
  margin: ${({ theme }) => `0 auto ${theme.spacing[6]}`};
  
  background: ${({ theme, $status }) => 
    $status === 'success' ? `color-mix(in srgb, ${theme.color.success} 12%, transparent)` :
    $status === 'error' ? `color-mix(in srgb, ${theme.color.destructive} 12%, transparent)` :
    `color-mix(in srgb, ${theme.color.mutedForeground} 12%, transparent)`};
    
  color: ${({ theme, $status }) =>
    $status === 'success' ? theme.color.success :
    $status === 'error' ? theme.color.destructive :
    theme.color.primary};

  animation: ${scaleIn} 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;

  svg {
    ${({ $status }) => $status === 'loading' ? css`animation: ${spin} 1.2s linear infinite;` : 'animation: none;'}
  }
`

const Title = styled.h2`
  font-family: ${({ theme }) => theme.typography.fontFamily.sans};
  font-size: ${({ theme }) => theme.typography.fontSize.xl};
  font-weight: 600;
  color: ${({ theme }) => theme.color.foreground};
  margin: ${({ theme }) => `0 0 ${theme.spacing[3]}`};
  letter-spacing: -0.01em;
`

const Detail = styled.p`
  font-family: ${({ theme }) => theme.typography.fontFamily.sans};
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  color: ${({ theme }) => theme.color.mutedForeground};
  margin: 0;
  line-height: 1.5;
`

const ContentWrapper = styled.div`
  animation: ${fadeInUp} 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
`

const BackLink = styled.button`
  margin-top: ${({ theme }) => theme.spacing[6]};
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[4]}`};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: transparent;
  color: ${({ theme }) => theme.color.foreground};
  font-family: ${({ theme }) => theme.typography.fontFamily.sans};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: 500;
  cursor: pointer;
  transition: background-color 120ms;

  &:hover { background: ${({ theme }) => theme.color.muted}; }
`

export function GoogleAuthCallbackPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const setAuthenticated = useAuthStore(s => s.setAuthenticated)
  const setUser = useAuthStore(s => s.setUser)
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const submitted = useRef(false)

  useEffect(() => {
    // The state token is single-use on the server — StrictMode's double effect
    // run (or any re-render) must not POST the exchange twice.
    if (submitted.current) return
    submitted.current = true

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

    let isMounted = true

    api.post('/auth/google/callback', { code, state })
      .then(({ data }) => {
        if (!isMounted) return
        setStatus('success')
        setAuthenticated(true)
        if (data.user) setUser(data.user)
        setTimeout(() => isMounted && navigate('/app'), 1500)
      })
      .catch((err) => {
        if (!isMounted) return
        setStatus('error')
        setErrorMsg(err.response?.data?.detail || 'Authentication failed')
      })
      
    return () => { isMounted = false }
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

          {status === 'error' && (
            <BackLink type="button" onClick={() => navigate('/login')}>
              Back to sign in
            </BackLink>
          )}
        </ContentWrapper>
      </Card>
    </Root>
  )
}
