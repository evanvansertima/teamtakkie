import { useEffect, useState } from 'react'
import { api, ApiError, type User } from './lib/api'
import { LoginScreen } from './LoginScreen'

type AuthState =
  | { status: 'checking' }
  | { status: 'anonymous' }
  | { status: 'authenticated'; user: User }

function App() {
  const [auth, setAuth] = useState<AuthState>({ status: 'checking' })

  useEffect(() => {
    api
      .profile()
      .then(({ data }) => setAuth({ status: 'authenticated', user: data }))
      .catch((error) => {
        if (error instanceof ApiError && error.status === 401) {
          setAuth({ status: 'anonymous' })
        }
      })
  }, [])

  if (auth.status === 'checking') {
    return null
  }

  if (auth.status === 'anonymous') {
    return <LoginScreen onLogin={(user) => setAuth({ status: 'authenticated', user })} />
  }

  return (
    <main className="dashboard-shell">
      <header>
        <h1>FC Harlingen JO19-2</h1>
        <div>
          <span>{auth.user.fullName ?? auth.user.email}</span>
          <button
            type="button"
            onClick={() => api.logout().then(() => setAuth({ status: 'anonymous' }))}
          >
            Uitloggen
          </button>
        </div>
      </header>
      <p>
        Ingelogd en verbonden met de backend. De modules (spelers, wedstrijden,
        trainingen, live analyse, agenda, statistieken, tactieken) worden hier
        vanuit <code>legacy/fc-harlingen-app.html</code> overgezet.
      </p>
    </main>
  )
}

export default App
