import { useState } from 'react'
import type { Wedstrijd, WedstrijdInput } from '../../lib/api'
import { api, ApiError } from '../../lib/api'
import { FORMATIE_NAMEN } from '../../lib/formaties'

const LEEG: WedstrijdInput = {
  tegenstander: '',
  datum: '',
  tijd: '',
  locatie: '',
  thuis: true,
  formatie: '4-3-3A',
  speelduur: 90,
  notities: '',
}

export function WedstrijdForm({
  wedstrijd,
  onClose,
  onSaved,
}: {
  wedstrijd?: Wedstrijd
  onClose: () => void
  onSaved: (wedstrijd: Wedstrijd) => void
}) {
  const [form, setForm] = useState<WedstrijdInput>({
    ...LEEG,
    ...wedstrijd,
    datum: wedstrijd?.datum ? wedstrijd.datum.slice(0, 10) : '',
  })
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function set<K extends keyof WedstrijdInput>(key: K, value: WedstrijdInput[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function submit() {
    if (!form.tegenstander?.trim()) {
      setError('Vul een tegenstander in.')
      return
    }
    if (!form.datum) {
      setError('Vul een datum in.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const saved = wedstrijd
        ? await api.wedstrijden.update(wedstrijd.id, form)
        : await api.wedstrijden.create(form)
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
        <div className="modal-titel">{wedstrijd ? 'Wedstrijd bewerken' : 'Wedstrijd toevoegen'}</div>

        <div className="form-groep">
          <label>Tegenstander *</label>
          <input value={form.tegenstander} onChange={(e) => set('tegenstander', e.target.value)} placeholder="Naam tegenstander" />
        </div>
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
        <div className="form-groep">
          <label>Locatie / Sportpark</label>
          <input value={form.locatie ?? ''} onChange={(e) => set('locatie', e.target.value)} placeholder="Sportpark De Zeehoek" />
        </div>
        <div className="form-groep">
          <label>Thuis of uit?</label>
          <div className="chip-rij">
            <button type="button" className={'chip' + (form.thuis ? ' actief' : '')} onClick={() => set('thuis', true)}>
              Thuis
            </button>
            <button type="button" className={'chip' + (!form.thuis ? ' actief' : '')} onClick={() => set('thuis', false)}>
              Uit
            </button>
          </div>
        </div>
        <div className="form-rij">
          <div className="form-groep">
            <label>Formatie</label>
            <select value={form.formatie ?? ''} onChange={(e) => set('formatie', e.target.value)}>
              {FORMATIE_NAMEN.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div className="form-groep">
            <label>Speelduur (min)</label>
            <input type="number" value={form.speelduur ?? 90} onChange={(e) => set('speelduur', Number(e.target.value))} />
          </div>
        </div>
        <div className="form-groep">
          <label>Notities</label>
          <textarea rows={2} value={form.notities ?? ''} onChange={(e) => set('notities', e.target.value)} placeholder="Extra informatie…" />
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
