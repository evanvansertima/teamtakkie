import { useState } from 'react'
import type { Training, TrainingInput } from '../../lib/api'
import { api, ApiError } from '../../lib/api'

const LEEG: TrainingInput = {
  datum: '',
  tijd: '',
  locatie: '',
  duur: 90,
  doelstellingen: '',
  voorbereidingen: '',
  materialen: '',
  notities: '',
}

export function TrainingForm({
  training,
  onClose,
  onSaved,
}: {
  training?: Training
  onClose: () => void
  onSaved: (training: Training) => void
}) {
  const [form, setForm] = useState<TrainingInput>({
    ...LEEG,
    ...training,
    datum: training?.datum ? training.datum.slice(0, 10) : '',
  })
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function set<K extends keyof TrainingInput>(key: K, value: TrainingInput[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function submit() {
    if (!form.datum) {
      setError('Vul een datum in.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const saved = training
        ? await api.trainingen.update(training.id, form)
        : await api.trainingen.create(form)
      onSaved(saved)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Opslaan mislukt.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-sheet">
        <div className="modal-titel">{training ? 'Training bewerken' : 'Training toevoegen'}</div>

        <div className="form-rij">
          <div className="form-groep">
            <label>Datum *</label>
            <input type="date" value={form.datum ?? ''} onChange={(e) => set('datum', e.target.value)} />
          </div>
          <div className="form-groep">
            <label>Aanvangstijd</label>
            <input type="time" value={form.tijd ?? ''} onChange={(e) => set('tijd', e.target.value)} />
          </div>
        </div>
        <div className="form-rij">
          <div className="form-groep">
            <label>Locatie</label>
            <input value={form.locatie ?? ''} onChange={(e) => set('locatie', e.target.value)} placeholder="Sportpark De Zeehoek" />
          </div>
          <div className="form-groep">
            <label>Duur (min)</label>
            <input type="number" value={form.duur ?? 90} onChange={(e) => set('duur', Number(e.target.value))} />
          </div>
        </div>
        <div className="form-groep">
          <label>Doelstellingen</label>
          <textarea rows={2} value={form.doelstellingen ?? ''} onChange={(e) => set('doelstellingen', e.target.value)} placeholder="Wat wil je bereiken met deze training?" />
        </div>
        <div className="form-groep">
          <label>Voorbereiding</label>
          <textarea rows={2} value={form.voorbereidingen ?? ''} onChange={(e) => set('voorbereidingen', e.target.value)} placeholder="Veldopstelling, hesjes…" />
        </div>
        <div className="form-groep">
          <label>Materialen</label>
          <input value={form.materialen ?? ''} onChange={(e) => set('materialen', e.target.value)} placeholder="ballen, hesjes, pionnen…" />
        </div>
        <div className="form-groep">
          <label>Notities</label>
          <textarea rows={2} value={form.notities ?? ''} onChange={(e) => set('notities', e.target.value)} />
        </div>

        {error && <p className="form-error">{error}</p>}
        <div className="form-acties">
          <button type="button" className="knop lijn" onClick={onClose}>
            Annuleren
          </button>
          <button type="button" className="knop" onClick={submit} disabled={saving}>
            {saving ? 'Bezig…' : 'Opslaan'}
          </button>
        </div>
      </div>
    </div>
  )
}
