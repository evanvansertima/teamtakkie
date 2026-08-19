import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, type Training } from '../../lib/api'
import { TrainingForm } from './TrainingForm'

export function TrainingenPage() {
  const [trainingen, setTrainingen] = useState<Training[] | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const navigate = useNavigate()

  function laad() {
    api.trainingen.list().then(setTrainingen)
  }
  useEffect(laad, [])

  if (!trainingen) return <p>Laden…</p>

  const vandaag = new Date()
  vandaag.setHours(0, 0, 0, 0)
  const komend = trainingen
    .filter((t) => new Date(t.datum) >= vandaag)
    .sort((a, b) => new Date(a.datum).getTime() - new Date(b.datum).getTime())
  const geweest = trainingen
    .filter((t) => new Date(t.datum) < vandaag)
    .sort((a, b) => new Date(b.datum).getTime() - new Date(a.datum).getTime())

  return (
    <div>
      <div className="pagina-header">
        <div>
          <div className="eyebrow">Programma</div>
          <h2>Trainingen</h2>
          <p>{trainingen.length} trainingen</p>
        </div>
        <button className="knop-plus" onClick={() => setFormOpen(true)}>
          +
        </button>
      </div>

      {trainingen.length === 0 ? (
        <div className="leeg">
          <h3>Nog geen trainingen</h3>
          <p>Voeg de eerste training toe.</p>
          <button className="knop" onClick={() => setFormOpen(true)}>
            + Training toevoegen
          </button>
        </div>
      ) : (
        <>
          {komend.length > 0 && (
            <div className="linie-groep">
              <div className="linie-kop">Komend ({komend.length})</div>
              <div className="sp-lijst">
                {komend.map((t) => (
                  <TrainingRij key={t.id} t={t} onClick={() => navigate(`/trainingen/${t.id}`)} />
                ))}
              </div>
            </div>
          )}
          {geweest.length > 0 && (
            <div className="linie-groep">
              <div className="linie-kop">Geweest ({geweest.length})</div>
              <div className="sp-lijst">
                {geweest.map((t) => (
                  <TrainingRij key={t.id} t={t} onClick={() => navigate(`/trainingen/${t.id}`)} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {formOpen && (
        <TrainingForm
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

function TrainingRij({ t, onClick }: { t: Training; onClick: () => void }) {
  const datum = new Date(t.datum).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
  return (
    <div className="sp-rij" onClick={onClick}>
      <span className="sp-avatar">T</span>
      <span className="sp-naam">
        <span className="sp-nr">{datum}</span>
        {t.locatie || 'Training'}
        {t.tijd ? ` — ${t.tijd}` : ''}
      </span>
    </div>
  )
}
