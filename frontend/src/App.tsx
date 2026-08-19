import { useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { api, ApiError, type User } from './lib/api'
import { LoginScreen } from './LoginScreen'
import { AppShell } from './layout/AppShell'
import { SpelersPage } from './pages/spelers/SpelersPage'
import { SpelerDetailPage } from './pages/spelers/SpelerDetailPage'

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
    <AppShell user={auth.user} onLogout={() => api.logout().then(() => setAuth({ status: 'anonymous' }))}>
      <Routes>
        <Route path="/" element={<Navigate to="/spelers" replace />} />
        <Route path="/spelers" element={<SpelersPage />} />
        <Route path="/spelers/:id" element={<SpelerDetailPage />} />
        <Route path="*" element={<Navigate to="/spelers" replace />} />
      </Routes>
    </AppShell>
  )
}

export default App
