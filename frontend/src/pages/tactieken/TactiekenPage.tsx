import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, type Formatie } from '../../lib/api'

export function TactiekenPage() {
  const [formaties, setFormaties] = useState<Formatie[] | null>(null)
  const navigate = useNavigate()

  function laad() {
    api.formaties.list().then(setFormaties)
  }
  useEffect(laad, [])

  async function verwijder(id: number, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm('Deze formatie verwijderen?')) return
    await api.formaties.remove(id)
    laad()
  }

  if (!formaties) return <p>Laden…</p>

  return (
    <div>
      <div className="pagina-header">
        <div>
          <div className="eyebrow">Tactiek</div>
          <h2>Formaties</h2>
          <p>{formaties.length} opgeslagen</p>
        </div>
        <button className="knop-plus" onClick={() => navigate('/tactieken/nieuw')}>
          +
        </button>
      </div>

      {formaties.length === 0 ? (
        <div className="leeg">
          <h3>Nog geen formaties</h3>
          <p>Stel een opstelling samen op het veld.</p>
          <button className="knop" onClick={() => navigate('/tactieken/nieuw')}>
            + Formatie maken
          </button>
        </div>
      ) : (
        <div className="sp-lijst">
          {formaties.map((f) => (
            <div key={f.id} className="sp-rij" onClick={() => navigate(`/tactieken/${f.id}`)}>
              <span className="sp-avatar">{f.formatie.replace(/[A-Z]$/, '')}</span>
              <span className="sp-naam">
                {f.naam}
                <span className="rap-datum"> — {f.formatie}</span>
              </span>
              <button className="knop lijn klein" onClick={(e) => verwijder(f.id, e)}>
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
