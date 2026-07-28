import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@ct/shared/api/client'
import { Wrap, Card, Title, Message, Label, Field, Btn, ErrorBox, FootLink } from './auth/authScreen'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await api.post('/auth/forgot-password', { email })
      setSent(true)
    } catch {
      // The endpoint answers 202 for any address, so the only failures here are
      // transport or rate-limit — never "no such account".
      setError('Could not send the reset email. Please try again in a moment.')
    } finally {
      setLoading(false)
    }
  }

  if (sent) return (
    <Wrap>
      <Card>
        <Title>Check your email</Title>
        <Message>
          If an account exists for <strong>{email}</strong>, we've sent a link to reset
          your password. It expires in an hour and can be used once.
        </Message>
        <FootLink><Link to="/login">Back to sign in</Link></FootLink>
      </Card>
    </Wrap>
  )

  return (
    <Wrap>
      <Card>
        <Title>Reset your password</Title>
        <Message>Enter your email address and we'll send you a link to set a new password.</Message>
        <form onSubmit={submit}>
          <Label htmlFor="forgot-email">Email</Label>
          <Field
            id="forgot-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          {error && <ErrorBox>{error}</ErrorBox>}
          <Btn type="submit" disabled={loading || !email}>
            {loading ? 'Sending…' : 'Send reset link'}
          </Btn>
        </form>
        <FootLink><Link to="/login">Back to sign in</Link></FootLink>
      </Card>
    </Wrap>
  )
}
