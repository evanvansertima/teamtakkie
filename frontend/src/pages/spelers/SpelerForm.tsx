import { useState } from 'react'
import type { Speler, SpelerInput } from '../../lib/api'
import { api, ApiError } from '../../lib/api'
import { fcCategorieen, fcOvr, fcWaarde, fcCategorieWaarde, ovrKleur, FC_STERREN, fcSterren, BESCHIKBAARHEID, BENEN, ROL_VOLGORDE } from '../../lib/fc'

const LEEG: SpelerInput = {
  naam: '',
  rugnummer: '',
  positie: '',
  positie2: '',
  geboortedatum: '',
  favorietBeen: '',
  telefoon: '',
  email: '',
  adres: '',
  land: 'Nederland',
  beschikbaar: 'fit',
  beschikbaarNotitie: '',
  skills: {},
  sterren: {},
  stats: {},
}

export function SpelerForm({
  speler,
  onClose,
  onSaved,
}: {
  speler?: Speler
  onClose: () => void
  onSaved: (speler: Speler) => void
}) {
  const [form, setForm] = useState<SpelerInput>({ ...LEEG, ...speler })
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function set<K extends keyof SpelerInput>(key: K, value: SpelerInput[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }
  function setSkill(id: string, value: number) {
    setForm((f) => ({ ...f, skills: { ...f.skills, [id]: value } }))
  }
  function clearSkill(id: string) {
    setForm((f) => {
      const next = { ...f.skills }
      delete next[id]
      return { ...f, skills: next }
    })
  }
  function setSter(id: string, value: number) {
    setForm((f) => {
      const next = { ...f.sterren }
      if (next[id] === value) {
        delete next[id]
      } else {
        next[id] = value
      }
      return { ...f, sterren: next }
    })
  }
  function setStat(key: string, value: number) {
    setForm((f) => ({ ...f, stats: { ...f.stats, [key]: value } }))
  }

  async function submit() {
    if (!form.naam?.trim()) {
      setError('Vul een naam in.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const payload: SpelerInput = {
        ...form,
        positie: form.positie || undefined,
        positie2: form.positie2 || undefined,
        favorietBeen: form.favorietBeen || undefined,
        geboortedatum: form.geboortedatum || undefined,
      }
      const saved = speler
        ? await api.spelers.update(speler.id, payload)
        : await api.spelers.create(payload)
      onSaved(saved)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Opslaan mislukt.')
    } finally {
      setSaving(false)
    }
  }

  const ovr = fcOvr(form)

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-sheet">
        <div className="modal-titel">
          {speler ? 'Speler bewerken' : 'Speler toevoegen'}
          {ovr !== null && (
            <span className="ovr-badge" style={{ color: ovrKleur(ovr) }}>
              {ovr}
            </span>
          )}
        </div>

        <div className="form-sectie-titel">Persoonlijke gegevens</div>
        <div className="form-groep">
          <label>Volledige naam *</label>
          <input value={form.naam} onChange={(e) => set('naam', e.target.value)} placeholder="Voor- en achternaam" />
        </div>
        <div className="form-rij">
          <div className="form-groep">
            <label>Rugnummer</label>
            <input type="number" min={1} max={99} value={form.rugnummer ?? ''} onChange={(e) => set('rugnummer', e.target.value)} />
          </div>
          <div className="form-groep">
            <label>Positie</label>
            <select value={form.positie ?? ''} onChange={(e) => set('positie', e.target.value)}>
              <option value="">Kies positie</option>
              {ROL_VOLGORDE.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="form-rij">
          <div className="form-groep">
            <label>Extra positie</label>
            <select value={form.positie2 ?? ''} onChange={(e) => set('positie2', e.target.value)}>
              <option value="">Geen</option>
              {ROL_VOLGORDE.filter((p) => p !== form.positie).map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div className="form-groep">
            <label>Geboortedatum</label>
            <input type="date" value={form.geboortedatum ?? ''} onChange={(e) => set('geboortedatum', e.target.value)} />
          </div>
        </div>
        <div className="form-groep">
          <label>Favoriet been</label>
          <div className="chip-rij">
            {BENEN.map((b) => (
              <button
                key={b.id}
                type="button"
                className={'chip' + (form.favorietBeen === b.id ? ' actief' : '')}
                onClick={() => set('favorietBeen', form.favorietBeen === b.id ? '' : b.id)}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>

        <div className="form-sectie-titel">Contactgegevens</div>
        <div className="form-groep">
          <label>Telefoon</label>
          <input type="tel" value={form.telefoon ?? ''} onChange={(e) => set('telefoon', e.target.value)} placeholder="+31 6 12345678" />
        </div>
        <div className="form-groep">
          <label>E-mail</label>
          <input type="email" value={form.email ?? ''} onChange={(e) => set('email', e.target.value)} placeholder="naam@email.nl" />
        </div>
        <div className="form-groep">
          <label>Adres</label>
          <input value={form.adres ?? ''} onChange={(e) => set('adres', e.target.value)} />
        </div>

        <div className="form-sectie-titel">Beschikbaarheid</div>
        <div className="chip-rij" style={{ marginBottom: 10 }}>
          {BESCHIKBAARHEID.map((b) => (
            <button
              key={b.id}
              type="button"
              className={'chip' + (form.beschikbaar === b.id ? ' actief' : '')}
              style={form.beschikbaar === b.id ? { borderColor: b.kleur, background: b.kleur, color: '#fff' } : undefined}
              onClick={() => set('beschikbaar', b.id)}
            >
              {b.label}
            </button>
          ))}
        </div>
        {form.beschikbaar && form.beschikbaar !== 'fit' && (
          <div className="form-groep">
            <label>Toelichting</label>
            <input value={form.beschikbaarNotitie ?? ''} onChange={(e) => set('beschikbaarNotitie', e.target.value)} placeholder="bijv. enkelblessure, terug over 2 weken" />
          </div>
        )}

        <div className="form-sectie-titel">Vaardigheden</div>
        <p className="form-hint">
          Schaal 1 tot 99. Laat staan wat je nog niet kunt beoordelen — alleen wat je aanraakt telt mee.
        </p>
        {fcCategorieen(form).map((cat) => {
          const catW = fcCategorieWaarde(form, cat)
          return (
            <div key={cat.id} className="fc-cat">
              <div className="fc-cat-kop">
                <span className="fc-cat-streep" style={{ background: cat.kleur }} />
                <span>{cat.label}</span>
                <span style={{ color: catW ? ovrKleur(catW) : undefined }}>{catW ?? '–'}</span>
              </div>
              {cat.attrs.map((a) => {
                const v = fcWaarde(form, a.id)
                return (
                  <div key={a.id} className="fc-rij">
                    <span className="fc-rij-naam">{a.label}</span>
                    <input
                      type="range"
                      min={1}
                      max={99}
                      value={v ?? 50}
                      onChange={(e) => setSkill(a.id, Number(e.target.value))}
                    />
                    <span className="fc-rij-waarde">{v ?? '–'}</span>
                    <button type="button" disabled={v === null} onClick={() => clearSkill(a.id)}>
                      ×
                    </button>
                  </div>
                )
              })}
            </div>
          )
        })}

        {FC_STERREN.map((s) => {
          const v = fcSterren(form, s.id)
          return (
            <div key={s.id} className="fc-ster-rij">
              <span className="fc-rij-naam" title={s.uitleg}>
                {s.label}
              </span>
              <span>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={'ster' + (v && n <= v ? ' aan' : '')}
                    onClick={() => setSter(s.id, n)}
                  >
                    ★
                  </button>
                ))}
              </span>
            </div>
          )
        })}

        <div className="form-sectie-titel">Beginstand</div>
        <p className="form-hint">Alleen invullen voor wat al gebeurd is vóórdat je deze app ging gebruiken.</p>
        <div className="stats-raster">
          {(
            [
              ['doelpunten', 'Doelpunten'],
              ['assists', 'Assists'],
              ['geelKaarten', 'Geel'],
              ['roodKaarten', 'Rood'],
              ['speelMinuten', 'Minuten'],
              ['wedstrijden', 'Wedstrijden'],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="stat-invoer">
              {label}
              <input
                type="number"
                min={0}
                value={form.stats?.[key] ?? 0}
                onChange={(e) => setStat(key, Number(e.target.value))}
              />
            </label>
          ))}
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
