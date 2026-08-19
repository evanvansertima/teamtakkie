import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import type { User } from '../lib/api'

const MODULES = [
  { to: '/spelers', label: 'Spelers', ready: true },
  { to: '/wedstrijden', label: 'Wedstrijden', ready: true },
  { to: '/trainingen', label: 'Trainingen', ready: true },
  { to: '/live', label: 'Live Analyse', ready: true },
  { to: '/agenda', label: 'Agenda', ready: true },
  { to: '/statistieken', label: 'Statistieken', ready: true },
  { to: '/tactieken', label: 'Tactieken', ready: true },
]

export function AppShell({
  user,
  onLogout,
  children,
}: {
  user: User
  onLogout: () => void
  children: ReactNode
}) {
  return (
    <div className="app-shell">
      <nav className="app-nav">
        <div className="app-nav-title">FC Harlingen JO19-2</div>
        <ul>
          {MODULES.map((m) => (
            <li key={m.to}>
              {m.ready ? (
                <NavLink to={m.to} className={({ isActive }) => (isActive ? 'active' : '')}>
                  {m.label}
                </NavLink>
              ) : (
                <span className="soon" title="Nog niet gebouwd">
                  {m.label}
                </span>
              )}
            </li>
          ))}
        </ul>
        <div className="app-nav-user">
          <span>{user.fullName ?? user.email}</span>
          <button type="button" onClick={onLogout}>
            Uitloggen
          </button>
        </div>
      </nav>
      <main className="app-content">{children}</main>
    </div>
  )
}
