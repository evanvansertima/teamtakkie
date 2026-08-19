import { useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { api, ApiError, type User } from './lib/api'
import { LoginScreen } from './LoginScreen'
import { AppShell } from './layout/AppShell'
import { SpelersPage } from './pages/spelers/SpelersPage'
import { SpelerDetailPage } from './pages/spelers/SpelerDetailPage'
import { WedstrijdenPage } from './pages/wedstrijden/WedstrijdenPage'
import { WedstrijdDetailPage } from './pages/wedstrijden/WedstrijdDetailPage'
import { TrainingenPage } from './pages/trainingen/TrainingenPage'
import { TrainingDetailPage } from './pages/trainingen/TrainingDetailPage'
import { LiveAnalysePage } from './pages/live/LiveAnalysePage'
import { LiveSessionPage } from './pages/live/LiveSessionPage'
import { AgendaPage } from './pages/agenda/AgendaPage'
import { StatistiekenPage } from './pages/statistieken/StatistiekenPage'
import { TactiekenPage } from './pages/tactieken/TactiekenPage'
import { TactiekEditorPage } from './pages/tactieken/TactiekEditorPage'
import { TactiekTekeningEditorPage } from './pages/tactieken/TactiekTekeningEditorPage'

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
        <Route path="/wedstrijden" element={<WedstrijdenPage />} />
        <Route path="/wedstrijden/:id" element={<WedstrijdDetailPage />} />
        <Route path="/trainingen" element={<TrainingenPage />} />
        <Route path="/trainingen/:id" element={<TrainingDetailPage />} />
        <Route path="/live" element={<LiveAnalysePage />} />
        <Route path="/live/:id" element={<LiveSessionPage />} />
        <Route path="/agenda" element={<AgendaPage />} />
        <Route path="/statistieken" element={<StatistiekenPage />} />
        <Route path="/tactieken" element={<TactiekenPage />} />
        <Route path="/tactieken/tekeningen/:id" element={<TactiekTekeningEditorPage />} />
        <Route path="/tactieken/:id" element={<TactiekEditorPage />} />
        <Route path="*" element={<Navigate to="/spelers" replace />} />
      </Routes>
    </AppShell>
  )
}

export default App
