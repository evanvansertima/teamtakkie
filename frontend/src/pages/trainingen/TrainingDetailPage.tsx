import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api, ApiError, type Training, type Aanwezigheid } from '../../lib/api'
import { TrainingForm } from './TrainingForm'

const AANWEZIG_OPTIES = [
  { id: 'aanwezig', label: 'Aanwezig', kleur: '#28a745' },
  { id: 'afwezig', label: 'Afwezig', kleur: '#dc3545' },
  { id: 'geblesseerd', label: 'Geblesseerd', kleur: '#fd7e14' },
] as const

export function TrainingDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [training, setTraining] = useState<Training | null>(null)
  const [formOpen, setFormOpen] = useState(false)

  function laad() {
    api.trainingen.get(Number(id)).then(setTraining)
  }
  useEffect(laad, [id])

  if (!training) return <p>Laden…</p>

  const datum = new Date(training.datum).toLocaleDateString('nl-NL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  async function verwijder() {
    if (!training || !confirm('Deze training verwijderen?')) return
    await api.trainingen.remove(training.id)
    navigate('/trainingen')
  }

  return (
    <div>
      <button className="terug" onClick={() => navigate('/trainingen')}>
        ← Trainingen
      </button>
      <div className="pagina-header">
        <div>
          <div className="eyebrow">{training.locatie || 'Training'}</div>
          <h2>{datum}</h2>
          <p>
            {training.tijd ? `${training.tijd} — ` : ''}
            {training.duur} minuten
          </p>
        </div>
      </div>

      {training.doelstellingen && (
        <div className="kaart" style={{ marginBottom: 16 }}>
          <div className="kaart-titel">Doelstellingen</div>
          <p className="rap-tekst">{training.doelstellingen}</p>
          {training.voorbereidingen && (
            <>
              <div className="kaart-titel" style={{ marginTop: 12 }}>
                Voorbereiding
              </div>
              <p className="rap-tekst">{training.voorbereidingen}</p>
            </>
          )}
          {training.materialen && (
            <>
              <div className="kaart-titel" style={{ marginTop: 12 }}>
                Materialen
              </div>
              <p className="rap-tekst">{training.materialen}</p>
            </>
          )}
        </div>
      )}

      <div className="kaart" style={{ marginBottom: 16 }}>
        <OnderdelenSectie training={training} onChanged={laad} />
      </div>

      <div className="kaart">
        <div className="kaart-titel">Aanwezigheid</div>
        {(training.aanwezigheden ?? []).length === 0 && <p className="form-hint">Nog geen spelers in de selectie.</p>}
        {(training.aanwezigheden ?? []).map((a) => (
          <AanwezigheidRij key={a.id} aanwezigheid={a} onChanged={laad} />
        ))}
      </div>

      <div className="form-acties">
        <button className="knop lijn" onClick={() => setFormOpen(true)}>
          Bewerken
        </button>
        <button className="knop gevaar" onClick={verwijder}>
          Verwijderen
        </button>
      </div>

      {formOpen && (
        <TrainingForm
          training={training}
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

function AanwezigheidRij({ aanwezigheid, onChanged }: { aanwezigheid: Aanwezigheid; onChanged: () => void }) {
  async function zetStatus(status: Aanwezigheid['status']) {
    await api.aanwezigheden.update(aanwezigheid.id, status)
    onChanged()
  }

  const huidig = AANWEZIG_OPTIES.find((o) => o.id === aanwezigheid.status) ?? AANWEZIG_OPTIES[0]

  return (
    <div className="sp-rij">
      <span className="sp-avatar">{aanwezigheid.speler?.naam.charAt(0)}</span>
      <span className="sp-naam">{aanwezigheid.speler?.naam}</span>
      <div className="chip-rij">
        {AANWEZIG_OPTIES.map((o) => (
          <button
            key={o.id}
            className={'chip' + (huidig.id === o.id ? ' actief' : '')}
            style={huidig.id === o.id ? { borderColor: o.kleur, background: o.kleur, color: '#fff' } : undefined}
            onClick={() => zetStatus(o.id)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

const TYPES = ['Warming-up', 'Oefening', 'Positiespel', 'Wedstrijdvorm', 'Conditie', 'Afkoelen'] as const

function OnderdelenSectie({ training, onChanged }: { training: Training; onChanged: () => void }) {
  const [nieuw, setNieuw] = useState(false)
  const [naam, setNaam] = useState('')
  const [type, setType] = useState<(typeof TYPES)[number]>('Oefening')
  const [duur, setDuur] = useState('15')
  const [error, setError] = useState<string | null>(null)

  async function voegToe() {
    if (!naam.trim()) {
      setError('Vul een naam in.')
      return
    }
    try {
      await api.onderdelen.create(training.id, { naam, type, duur: Number(duur) })
      setNieuw(false)
      setNaam('')
      setType('Oefening')
      setDuur('15')
      setError(null)
      onChanged()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Opslaan mislukt.')
    }
  }

  async function verwijder(id: number) {
    await api.onderdelen.remove(id)
    onChanged()
  }

  return (
    <>
      <div className="kaart-titel">Onderdelen ({training.onderdelen?.length ?? 0})</div>
      {(training.onderdelen ?? []).length === 0 && !nieuw && <p className="form-hint">Nog geen onderdelen.</p>}
      {(training.onderdelen ?? []).map((o, i) => (
        <div key={o.id} className="sp-rij">
          <span className="sp-naam">
            {i + 1}. {o.naam}
            {o.type ? ` — ${o.type}` : ''}
            {o.duur ? ` (${o.duur}')` : ''}
          </span>
          <button className="knop lijn klein" onClick={() => verwijder(o.id)}>
            ×
          </button>
        </div>
      ))}
      {nieuw ? (
        <div>
          <div className="form-rij">
            <div className="form-groep">
              <label>Naam onderdeel *</label>
              <input value={naam} onChange={(e) => setNaam(e.target.value)} placeholder="bijv. Rondo 6v2" />
            </div>
            <div className="form-groep">
              <label>Duur (min)</label>
              <input type="number" value={duur} onChange={(e) => setDuur(e.target.value)} />
            </div>
          </div>
          <div className="form-groep">
            <label>Type</label>
            <div className="chip-rij">
              {TYPES.map((t) => (
                <button key={t} className={'chip' + (type === t ? ' actief' : '')} onClick={() => setType(t)}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          {error && <p className="form-error">{error}</p>}
          <div className="form-acties">
            <button className="knop lijn" onClick={() => setNieuw(false)}>
              Annuleren
            </button>
            <button className="knop" onClick={voegToe}>
              Toevoegen
            </button>
          </div>
        </div>
      ) : (
        <button className="knop lijn klein" onClick={() => setNieuw(true)}>
          + Nieuw onderdeel
        </button>
      )}
    </>
  )
}
