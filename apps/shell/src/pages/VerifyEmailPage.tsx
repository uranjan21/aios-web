import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import styled from 'styled-components'
import { api } from '@aios/shared/api/client'

const Wrap = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
`

const Card = styled.div`
  max-width: 400px;
  width: 100%;
  padding: 32px;
  background: var(--color-surface);
  border-radius: 16px;
  text-align: center;
`

const Title = styled.h1`
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 12px;
`

const Message = styled.p`
  font-size: 14px;
  color: var(--color-muted);
  margin-bottom: 24px;
`

const Btn = styled.button`
  padding: 10px 24px;
  background: var(--color-primary, #114b3f);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
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
        <Message>Your email address has been verified. You now have full access to AIOS.</Message>
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
