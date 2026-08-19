import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, type Wedstrijd } from '../../lib/api'

export function LiveAnalysePage() {
  const [wedstrijden, setWedstrijden] = useState<Wedstrijd[] | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    api.wedstrijden.list().then(setWedstrijden)
  }, [])

  if (!wedstrijden) return <p>Laden…</p>

  const sorted = [...wedstrijden].sort((a, b) => new Date(b.datum).getTime() - new Date(a.datum).getTime())

  return (
    <div>
      <div className="pagina-header">
        <div>
          <div className="eyebrow">Live</div>
          <h2>Live Analyse</h2>
          <p>Kies een wedstrijd om te volgen</p>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="leeg">
          <h3>Geen wedstrijden</h3>
          <p>Maak eerst een wedstrijd aan bij Wedstrijden.</p>
        </div>
      ) : (
        <div className="sp-lijst">
          {sorted.map((w) => (
            <div key={w.id} className="sp-rij" onClick={() => navigate(`/live/${w.id}`)}>
              <span className="sp-avatar">{w.thuis ? 'T' : 'U'}</span>
              <span className="sp-naam">
                <span className="sp-nr">{new Date(w.datum).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}</span>
                {(w.thuis ? 'Thuis vs. ' : 'Uit bij ') + w.tegenstander}
              </span>
              {w.status === 'gespeeld' && w.score && (
                <span className="ovr-badge">
                  {w.score.fch ?? 0}–{w.score.teg ?? 0}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
