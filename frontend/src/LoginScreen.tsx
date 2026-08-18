import { useState, type FormEvent } from 'react'
import { api, type User } from './lib/api'

export function LoginScreen({ onLogin }: { onLogin: (user: User) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const { data } = await api.login(email, password)
      onLogin(data.user)
    } catch {
      setError('Onjuiste inloggegevens')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="login-screen">
      <form onSubmit={handleSubmit}>
        <h1>FC Harlingen JO19-2</h1>
        <label>
          E-mail
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label>
          Wachtwoord
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        {error && <p role="alert">{error}</p>}
        <button type="submit" disabled={submitting}>
          {submitting ? 'Bezig...' : 'Inloggen'}
        </button>
      </form>
    </main>
  )
}
