import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '@ct/shared/api/client'
import { errorMessage } from '@ct/shared/lib/utils'
import { Wrap, Card, Title, Message, Label, Field, Btn, ErrorBox, FootLink } from './auth/authScreen'

export function ResetPasswordPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    if (password !== confirm) { setError('The two passwords do not match'); return }
    setLoading(true)
    setError('')
    try {
      await api.post('/auth/reset-password', { token, password })
      setDone(true)
    } catch (err) {
      setError(errorMessage(err, 'This reset link is invalid or has expired.'))
    } finally {
      setLoading(false)
    }
  }

  if (!token) return (
    <Wrap>
      <Card>
        <Title>Link is incomplete</Title>
        <Message>This reset link is missing its token. Request a fresh one and try again.</Message>
        <FootLink><Link to="/forgot-password">Request a new link</Link></FootLink>
      </Card>
    </Wrap>
  )

  if (done) return (
    <Wrap>
      <Card>
        <Title>Password updated</Title>
        <Message>
          Your password has been changed and every other session has been signed out.
          Sign in with your new password.
        </Message>
        <Btn onClick={() => navigate('/login')}>Go to sign in</Btn>
      </Card>
    </Wrap>
  )

  return (
    <Wrap>
      <Card>
        <Title>Choose a new password</Title>
        <Message>Pick something at least 8 characters long.</Message>
        <form onSubmit={submit}>
          <Label htmlFor="reset-password">New password</Label>
          <Field
            id="reset-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          <Label htmlFor="reset-confirm">Confirm new password</Label>
          <Field
            id="reset-confirm"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            required
          />
          {error && <ErrorBox>{error}</ErrorBox>}
          <Btn type="submit" disabled={loading || !password || !confirm}>
            {loading ? 'Updating…' : 'Update password'}
          </Btn>
        </form>
        <FootLink><Link to="/forgot-password">Request a new link</Link></FootLink>
      </Card>
    </Wrap>
  )
}
