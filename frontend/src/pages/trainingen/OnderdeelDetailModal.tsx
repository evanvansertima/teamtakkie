import { useEffect, useState } from 'react'
import { api, ApiError, type Onderdeel, type Speler } from '../../lib/api'
import { LEGE_TEKENING, type Tekening } from '../../lib/tekenbord/types'
import { TekenBord } from '../../components/TekenBord'

const TYPES = ['Warming-up', 'Oefening', 'Positiespel', 'Wedstrijdvorm', 'Conditie', 'Afkoelen'] as const

export function OnderdeelDetailModal({ onderdeel, onClose, onSaved }: { onderdeel: Onderdeel; onClose: () => void; onSaved: () => void }) {
  const [naam, setNaam] = useState(onderdeel.naam)
  const [type, setType] = useState<(typeof TYPES)[number]>((onderdeel.type as (typeof TYPES)[number]) || 'Oefening')
  const [doel, setDoel] = useState(onderdeel.doel ?? '')
  const [duur, setDuur] = useState(String(onderdeel.duur ?? 15))
  const [aantalSpelers, setAantalSpelers] = useState(onderdeel.aantalSpelers ? String(onderdeel.aantalSpelers) : '')
  const [veldGrootte, setVeldGrootte] = useState(onderdeel.veldGrootte ?? '')
  const [materialen, setMaterialen] = useState(onderdeel.materialen ?? '')
  const [beschrijving, setBeschrijving] = useState(onderdeel.beschrijving ?? '')
  const [aandachtspunten, setAandachtspunten] = useState(onderdeel.aandachtspunten ?? '')
  const [tekening, setTekening] = useState<Tekening>(onderdeel.tekening ?? LEGE_TEKENING)
  const [spelers, setSpelers] = useState<Speler[]>([])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [tonenTekenbord, setTonenTekenbord] = useState(!!onderdeel.tekening?.elems?.length || !!onderdeel.tekening?.lijnen?.length)

  useEffect(() => {
    api.spelers.list().then(setSpelers)
  }, [])

  async function opslaan() {
    if (!naam.trim()) {
      setError('Vul een naam in.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await api.onderdelen.update(onderdeel.id, {
        naam: naam.trim(),
        type,
        doel: doel.trim() || undefined,
        duur: Number(duur) || undefined,
        aantalSpelers: aantalSpelers ? Number(aantalSpelers) : undefined,
        veldGrootte: veldGrootte.trim() || undefined,
        materialen: materialen.trim() || undefined,
        beschrijving: beschrijving.trim() || undefined,
        aandachtspunten: aandachtspunten.trim() || undefined,
        tekening,
      })
      onSaved()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Opslaan mislukt.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-sheet" style={{ maxWidth: 720 }}>
        <div className="modal-titel">Onderdeel bewerken</div>

        <div className="form-rij">
          <div className="form-groep">
            <label>Naam *</label>
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

        <div className="form-rij">
          <div className="form-groep">
            <label>Doel</label>
            <input value={doel} onChange={(e) => setDoel(e.target.value)} placeholder="bijv. Balbezit onder druk" />
          </div>
          <div className="form-groep">
            <label>Aantal spelers</label>
            <input type="number" value={aantalSpelers} onChange={(e) => setAantalSpelers(e.target.value)} />
          </div>
        </div>

        <div className="form-rij">
          <div className="form-groep">
            <label>Veldgrootte</label>
            <input value={veldGrootte} onChange={(e) => setVeldGrootte(e.target.value)} placeholder="bijv. 20x30m" />
          </div>
          <div className="form-groep">
            <label>Materialen</label>
            <input value={materialen} onChange={(e) => setMaterialen(e.target.value)} placeholder="bijv. Hoedjes, hesjes" />
          </div>
        </div>

        <div className="form-groep">
          <label>Beschrijving</label>
          <textarea rows={2} value={beschrijving} onChange={(e) => setBeschrijving(e.target.value)} placeholder="Hoe werkt de oefening?" />
        </div>
        <div className="form-groep">
          <label>Aandachtspunten</label>
          <textarea rows={2} value={aandachtspunten} onChange={(e) => setAandachtspunten(e.target.value)} placeholder="Coachpunten…" />
        </div>

        <div className="form-groep">
          {tonenTekenbord ? (
            <>
              <label>Tekening</label>
              <TekenBord
                value={tekening}
                onChange={setTekening}
                pdfNaam={naam || 'Onderdeel'}
                pdfInfo={{ type, doel, duur: Number(duur) || undefined, aantalSpelers: aantalSpelers ? Number(aantalSpelers) : undefined, veldGrootte, materialen, beschrijving, aandachtspunten }}
                spelers={spelers}
              />
            </>
          ) : (
            <button type="button" className="knop lijn klein" onClick={() => setTonenTekenbord(true)}>
              + Tekening toevoegen
            </button>
          )}
        </div>

        {error && <p className="form-error">{error}</p>}
        <div className="form-acties">
          <button className="knop lijn" onClick={onClose}>
            Annuleren
          </button>
          <button className="knop" onClick={opslaan} disabled={saving}>
            {saving ? 'Bezig…' : 'Opslaan'}
          </button>
        </div>
      </div>
    </div>
  )
}
