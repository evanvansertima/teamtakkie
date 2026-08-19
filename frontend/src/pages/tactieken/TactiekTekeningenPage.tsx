import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, type Tactiek } from '../../lib/api'

export function TactiekTekeningenPage() {
  const [tekeningen, setTekeningen] = useState<Tactiek[] | null>(null)
  const navigate = useNavigate()

  function laad() {
    api.tactieken.list().then(setTekeningen)
  }
  useEffect(laad, [])

  async function verwijder(id: number, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm('Deze tekening verwijderen?')) return
    await api.tactieken.remove(id)
    laad()
  }

  if (!tekeningen) return <p>Laden…</p>

  return (
    <div>
      {tekeningen.length === 0 ? (
        <div className="leeg">
          <h3>Nog geen tekeningen</h3>
          <p>Teken een aanval, standaardsituatie of press-schema en sla hem op.</p>
          <button className="knop" onClick={() => navigate('/tactieken/tekeningen/nieuw')}>
            + Nieuwe tekening
          </button>
        </div>
      ) : (
        <div className="sp-lijst">
          {tekeningen.map((t) => {
            const aantalElems = t.tekening?.elems?.length ?? 0
            const aantalLijnen = t.tekening?.lijnen?.length ?? 0
            return (
              <div key={t.id} className="sp-rij" onClick={() => navigate(`/tactieken/tekeningen/${t.id}`)}>
                <span className="sp-avatar">✎</span>
                <span className="sp-naam">
                  {t.naam}
                  <span className="rap-datum"> — {aantalElems > 0 || aantalLijnen > 0 ? `${aantalElems} elementen, ${aantalLijnen} lijnen` : 'Lege tekening'}</span>
                </span>
                <button className="knop lijn klein" onClick={(e) => verwijder(t.id, e)}>
                  ×
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
