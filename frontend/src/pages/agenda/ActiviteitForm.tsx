import { useState } from 'react'
import type { Activiteit, ActiviteitInput } from '../../lib/api'
import { api, ApiError } from '../../lib/api'
import { ACTIVITEIT_SOORTEN } from '../../lib/agenda'

const LEEG: ActiviteitInput = {
  titel: '',
  soort: 'overig',
  datum: '',
  locatie: '',
  heleDag: true,
  tijd: '',
  eindtijd: '',
  herhaal: 'nee',
  herhaalTot: '',
  notitie: '',
}

export function ActiviteitForm({
  activiteit,
  standaardDatum,
  onClose,
  onSaved,
}: {
  activiteit?: Activiteit
  standaardDatum?: string
  onClose: () => void
  onSaved: (a: Activiteit) => void
}) {
  const [form, setForm] = useState<ActiviteitInput>({
    ...LEEG,
    ...activiteit,
    datum: activiteit?.datum ? activiteit.datum.slice(0, 10) : (standaardDatum ?? ''),
    herhaalTot: activiteit?.herhaalTot ? activiteit.herhaalTot.slice(0, 10) : '',
  })
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function set<K extends keyof ActiviteitInput>(key: K, value: ActiviteitInput[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function submit() {
    if (!form.titel?.trim()) {
      setError('Geef de activiteit een naam.')
      return
    }
    if (!form.datum) {
      setError('Kies een datum.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const saved = activiteit
        ? await api.activiteiten.update(activiteit.id, form)
        : await api.activiteiten.create(form)
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
        <div className="modal-titel">{activiteit ? 'Activiteit bewerken' : 'Activiteit toevoegen'}</div>

        <div className="form-groep">
          <label>Wat is het? *</label>
          <input value={form.titel} onChange={(e) => set('titel', e.target.value)} placeholder="bijv. Teamavond, ouderavond…" />
        </div>

        <div className="form-groep">
          <label>Soort</label>
          <div className="chip-rij">
            {ACTIVITEIT_SOORTEN.map((s) => (
              <button
                key={s.id}
                type="button"
                className={'chip' + (form.soort === s.id ? ' actief' : '')}
                style={form.soort === s.id ? { borderColor: s.kleur, background: s.kleur, color: '#fff' } : undefined}
                onClick={() => set('soort', s.id)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="form-rij">
          <div className="form-groep">
            <label>Datum *</label>
            <input type="date" value={form.datum ?? ''} onChange={(e) => set('datum', e.target.value)} />
          </div>
          <div className="form-groep">
            <label>Locatie</label>
            <input value={form.locatie ?? ''} onChange={(e) => set('locatie', e.target.value)} placeholder="Kantine, sportpark…" />
          </div>
        </div>

        <div className="form-groep">
          <label>
            <input type="checkbox" checked={!!form.heleDag} onChange={(e) => set('heleDag', e.target.checked)} style={{ marginRight: 6 }} />
            Hele dag, geen vaste tijd
          </label>
        </div>

        {!form.heleDag && (
          <div className="form-rij">
            <div className="form-groep">
              <label>Van</label>
              <input type="time" value={form.tijd ?? ''} onChange={(e) => set('tijd', e.target.value)} />
            </div>
            <div className="form-groep">
              <label>Tot</label>
              <input type="time" value={form.eindtijd ?? ''} onChange={(e) => set('eindtijd', e.target.value)} />
            </div>
          </div>
        )}

        <div className="form-rij">
          <div className="form-groep">
            <label>Herhalen</label>
            <select value={form.herhaal ?? 'nee'} onChange={(e) => set('herhaal', e.target.value as ActiviteitInput['herhaal'])}>
              <option value="nee">Eenmalig</option>
              <option value="wekelijks">Elke week</option>
              <option value="tweewekelijks">Om de week</option>
              <option value="maandelijks">Elke maand</option>
            </select>
          </div>
          {form.herhaal && form.herhaal !== 'nee' && (
            <div className="form-groep">
              <label>Tot en met</label>
              <input type="date" value={form.herhaalTot ?? ''} onChange={(e) => set('herhaalTot', e.target.value)} />
            </div>
          )}
        </div>

        <div className="form-groep">
          <label>Notitie</label>
          <textarea rows={2} value={form.notitie ?? ''} onChange={(e) => set('notitie', e.target.value)} placeholder="Extra uitleg voor jezelf of het team…" />
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
