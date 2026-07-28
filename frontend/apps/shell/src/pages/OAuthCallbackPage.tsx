import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { api } from '@ct/shared/api/client'
import { track } from '@ct/shared/lib/analytics'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'
import styled, { useTheme } from 'styled-components'

const Root = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => theme.color.background};
`

const Card = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => `${theme.spacing[4]}`};
  padding: ${({ theme }) => `${theme.spacing[10]}`};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.color.card};
  border: 1px solid ${({ theme }) => theme.color.border};
  box-shadow: ${({ theme }) => theme.shadow.md};
  text-align: center;
  max-width: 400px;
`

const Heading = styled.h2`
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  font-weight: 600;
  color: ${({ theme }) => theme.color.foreground};
  margin: 0;
`

const Detail = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  color: ${({ theme }) => theme.color.mutedForeground};
  margin: 0;
`

const Spinner = styled(Loader2)`
  animation: spin 1s linear infinite;
  @keyframes spin { to { transform: rotate(360deg); } }
`

export function OAuthCallbackPage() {
  const theme = useTheme()
  const navigate = useNavigate()
  const { provider } = useParams<{ provider: string }>()
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('Connecting your account...')
  const submitted = useRef(false)

  useEffect(() => {
    // The state token is single-use on the server — StrictMode's double effect
    // run must not POST the exchange twice.
    if (submitted.current) return
    submitted.current = true

    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    if (error) {
      setStatus('error')
      setMessage(error === 'access_denied' ? 'You declined the connection.' : `OAuth error: ${error}`)
      setTimeout(() => navigate('/app/settings?section=connections'), 3000)
      return
    }

    if (!code || !state || !provider) {
      setStatus('error')
      setMessage('Missing OAuth parameters.')
      setTimeout(() => navigate('/app/settings?section=connections'), 3000)
      return
    }

    api
      .post(`/integrations/${provider}/callback`, { code, state })
      .then((resp) => {
        setStatus('success')
        setMessage(`Connected as ${resp.data.email || provider}`)
        // Gmail is the transaction-capture wedge — track it distinctly.
        if (provider === 'gmail') track('gmail_connected')
        const providerLabels: Record<string, string> = {
          gcal: 'Google Calendar', gfit: 'Google Fit', gmail: 'Gmail', notion: 'Notion',
        }
        toast.success(`${providerLabels[provider] ?? provider} connected!`)
        setTimeout(() => navigate('/app/settings?section=connections'), 2000)
      })
      .catch((err) => {
        setStatus('error')
        const detail = err?.response?.data?.detail || 'Connection failed. Please try again.'
        setMessage(detail)
        toast.error(detail)
        setTimeout(() => navigate('/app/settings?section=connections'), 4000)
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Root>
      <Card>
        {status === 'loading' && <Spinner size={32} color={theme.color.primary} />}
        {status === 'success' && <CheckCircle size={32} color={theme.color.success} />}
        {status === 'error' && <XCircle size={32} color={theme.color.destructive} />}
        <Heading>
          {status === 'loading' ? 'Connecting...' : status === 'success' ? 'Connected!' : 'Connection Failed'}
        </Heading>
        <Detail>{message}</Detail>
      </Card>
    </Root>
  )
}
