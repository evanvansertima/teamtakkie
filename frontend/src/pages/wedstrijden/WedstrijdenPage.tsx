import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, type Wedstrijd } from '../../lib/api'
import { WedstrijdForm } from './WedstrijdForm'

export function WedstrijdenPage() {
  const [wedstrijden, setWedstrijden] = useState<Wedstrijd[] | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const navigate = useNavigate()

  function laad() {
    api.wedstrijden.list().then(setWedstrijden)
  }
  useEffect(laad, [])

  if (!wedstrijden) return <p>Laden…</p>

  const gepland = wedstrijden
    .filter((w) => w.status === 'gepland')
    .sort((a, b) => new Date(a.datum).getTime() - new Date(b.datum).getTime())
  const gespeeld = wedstrijden
    .filter((w) => w.status === 'gespeeld')
    .sort((a, b) => new Date(b.datum).getTime() - new Date(a.datum).getTime())

  return (
    <div>
      <div className="pagina-header">
        <div>
          <div className="eyebrow">Programma</div>
          <h2>Wedstrijden</h2>
          <p>
            {gepland.length} gepland, {gespeeld.length} gespeeld
          </p>
        </div>
        <button className="knop-plus" onClick={() => setFormOpen(true)}>
          +
        </button>
      </div>

      {wedstrijden.length === 0 ? (
        <div className="leeg">
          <h3>Nog geen wedstrijden</h3>
          <p>Voeg de eerste wedstrijd toe aan het programma.</p>
          <button className="knop" onClick={() => setFormOpen(true)}>
            + Wedstrijd toevoegen
          </button>
        </div>
      ) : (
        <>
          {gepland.length > 0 && (
            <div className="linie-groep">
              <div className="linie-kop">Gepland ({gepland.length})</div>
              <div className="sp-lijst">
                {gepland.map((w) => (
                  <WedstrijdRij key={w.id} w={w} onClick={() => navigate(`/wedstrijden/${w.id}`)} />
                ))}
              </div>
            </div>
          )}
          {gespeeld.length > 0 && (
            <div className="linie-groep">
              <div className="linie-kop">Gespeeld ({gespeeld.length})</div>
              <div className="sp-lijst">
                {gespeeld.map((w) => (
                  <WedstrijdRij key={w.id} w={w} onClick={() => navigate(`/wedstrijden/${w.id}`)} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {formOpen && (
        <WedstrijdForm
          onClose={() => setFormOpen(false)}
          onSaved={() => {
            setFormOpen(false)
            laad()
          }}
        />
      )}
    </div>
  )
}

function WedstrijdRij({ w, onClick }: { w: Wedstrijd; onClick: () => void }) {
  const datum = new Date(w.datum).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
  return (
    <div className="sp-rij" onClick={onClick}>
      <span className="sp-avatar">{w.thuis ? 'T' : 'U'}</span>
      <span className="sp-naam">
        <span className="sp-nr">{datum}</span>
        {w.tegenstander}
      </span>
      {w.status === 'gespeeld' && w.score && (
        <span className="ovr-badge">
          {w.score.fch ?? 0}–{w.score.teg ?? 0}
        </span>
      )}
    </div>
  )
}
