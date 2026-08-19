import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, type Formatie } from '../../lib/api'
import { TactiekTekeningenPage } from './TactiekTekeningenPage'

type Tab = 'formaties' | 'tekeningen'

export function TactiekenPage() {
  const [tab, setTab] = useState<Tab>('formaties')
  const navigate = useNavigate()

  return (
    <div>
      <div className="pagina-header">
        <div>
          <div className="eyebrow">Tactiek</div>
          <h2>Tactieken</h2>
        </div>
        <button className="knop-plus" onClick={() => navigate(tab === 'formaties' ? '/tactieken/nieuw' : '/tactieken/tekeningen/nieuw')}>
          +
        </button>
      </div>

      <div className="chip-rij" style={{ marginBottom: 16 }}>
        <button className={'chip' + (tab === 'formaties' ? ' actief' : '')} onClick={() => setTab('formaties')}>
          Formaties
        </button>
        <button className={'chip' + (tab === 'tekeningen' ? ' actief' : '')} onClick={() => setTab('tekeningen')}>
          Tekeningen
        </button>
      </div>

      {tab === 'formaties' ? <FormatiesTab /> : <TactiekTekeningenPage />}
    </div>
  )
}

function FormatiesTab() {
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

  return formaties.length === 0 ? (
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
  )
}
