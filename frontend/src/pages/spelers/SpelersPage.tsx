import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, spelerFotoUrl, type Speler } from '../../lib/api'
import { fcOvr, ovrKleur, beschikbaarheidInfo, ROL_VOLGORDE } from '../../lib/fc'
import { SpelerForm } from './SpelerForm'

export function SpelersPage() {
  const [spelers, setSpelers] = useState<Speler[] | null>(null)
  const [zoek, setZoek] = useState('')
  const [filterPos, setFilterPos] = useState('Alle')
  const [formOpen, setFormOpen] = useState(false)
  const navigate = useNavigate()

  function laad() {
    api.spelers.list().then(setSpelers)
  }
  useEffect(laad, [])

  if (!spelers) return <p>Laden…</p>

  const posities = ['Alle', ...ROL_VOLGORDE]
  const gefilterd = spelers
    .filter((s) => filterPos === 'Alle' || s.positie === filterPos)
    .filter((s) => s.naam.toLowerCase().includes(zoek.toLowerCase()) || String(s.rugnummer ?? '').includes(zoek))

  const groepen = [...ROL_VOLGORDE, 'Overig'].map((rol) => ({
    rol,
    spelers: gefilterd
      .filter((s) => (rol === 'Overig' ? !s.positie : s.positie === rol))
      .sort((a, b) => (Number(a.rugnummer) || 999) - (Number(b.rugnummer) || 999)),
  }))

  return (
    <div>
      <div className="pagina-header">
        <div>
          <div className="eyebrow">Selectie</div>
          <h2>Spelers</h2>
          <p>
            {spelers.length} speler{spelers.length !== 1 ? 's' : ''} in de selectie
          </p>
        </div>
        <button className="knop-plus" onClick={() => setFormOpen(true)}>
          +
        </button>
      </div>

      {spelers.length > 0 && (
        <>
          <input className="zoekbalk" placeholder="Zoek op naam of nummer…" value={zoek} onChange={(e) => setZoek(e.target.value)} />
          <div className="chip-rij" style={{ marginBottom: 16 }}>
            {posities.map((p) => (
              <button key={p} className={'chip' + (filterPos === p ? ' actief' : '')} onClick={() => setFilterPos(p)}>
                {p}
              </button>
            ))}
          </div>
        </>
      )}

      {spelers.length === 0 ? (
        <div className="leeg">
          <h3>Nog geen spelers</h3>
          <p>Voeg je eerste speler toe aan de selectie.</p>
          <button className="knop" onClick={() => setFormOpen(true)}>
            + Speler toevoegen
          </button>
        </div>
      ) : (
        groepen.map(
          (g) =>
            g.spelers.length > 0 && (
              <div key={g.rol} className="linie-groep">
                <div className="linie-kop">
                  {g.rol === 'Overig' ? 'Zonder positie' : g.rol === 'Keeper' ? 'Keepers' : g.rol + 's'} ({g.spelers.length})
                </div>
                <div className="sp-lijst">
                  {g.spelers.map((s) => {
                    const ovr = fcOvr(s)
                    const besch = beschikbaarheidInfo(s.beschikbaar)
                    return (
                      <div key={s.id} className="sp-rij" onClick={() => navigate(`/spelers/${s.id}`)}>
                        <span className="sp-avatar">{spelerFotoUrl(s) ? <img src={spelerFotoUrl(s)!} alt="" /> : s.naam.charAt(0)}</span>
                        <span className="sp-naam">
                          {s.rugnummer && <span className="sp-nr">#{s.rugnummer}</span>}
                          {s.naam}
                        </span>
                        <span className="sp-status" style={{ color: besch.kleur }}>
                          {besch.label}
                        </span>
                        <span className="ovr-badge" style={{ color: ovr ? ovrKleur(ovr) : undefined }}>
                          {ovr ?? '–'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ),
        )
      )}

      {formOpen && (
        <SpelerForm
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
