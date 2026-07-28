import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import styled from 'styled-components'
import { api } from '@ct/shared/api/client'

const Wrap = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => `${theme.spacing[6]}`};
`

const Card = styled.div`
  max-width: 400px;
  width: 100%;
  padding: ${({ theme }) => `${theme.spacing[8]}`};
  background: var(--color-surface);
  border-radius: ${({ theme }) => theme.radii.md};
  text-align: center;
`

const Title = styled.h1`
  font-size: ${({ theme }) => theme.typography.fontSize.xl};
  font-weight: 600;
  margin-bottom: ${({ theme }) => `${theme.spacing[3]}`};
`

const Message = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  color: var(--color-muted);
  margin-bottom: ${({ theme }) => `${theme.spacing[6]}`};
`

const Btn = styled.button`
  padding: ${({ theme }) => `${theme.spacing[2.5]} ${theme.spacing[6]}`};
  background: ${({ theme }) => theme.color.primary};
  color: ${({ theme }) => theme.color.primaryForeground};
  border: none;
  border-radius: ${({ theme }) => theme.radii.sm};
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-weight: 500;
  cursor: pointer;
`

export function VerifyEmailPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()

  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying')

  useEffect(() => {
    const token = params.get('token')
    if (!token) { setStatus('error'); return }

    // The endpoint no longer issues a session cookie (link-prefetch safety) —
    // the user's existing signup session simply clears the verified gate now.
    api.get('/auth/verify-email', { params: { token } })
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'))
  }, [params])

  if (status === 'verifying') return <Wrap><Card><Message>Verifying your email…</Message></Card></Wrap>

  if (status === 'success') return (
    <Wrap>
      <Card>
        <Title>Email verified!</Title>
        <Message>Your email address has been verified. You now have full access to Control Tower.</Message>
        <Btn onClick={() => navigate('/app')}>Go to dashboard</Btn>
      </Card>
    </Wrap>
  )

  return (
    <Wrap>
      <Card>
        <Title>Verification failed</Title>
        <Message>This link is invalid or has already been used. Request a new link from the app.</Message>
        <Btn onClick={() => navigate('/app')}>Back to app</Btn>
      </Card>
    </Wrap>
  )
}
