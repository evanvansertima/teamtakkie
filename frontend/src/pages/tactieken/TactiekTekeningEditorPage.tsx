import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api, ApiError, type Speler } from '../../lib/api'
import { LEGE_TEKENING, type Tekening } from '../../lib/tekenbord/types'
import { TekenBord } from '../../components/TekenBord'

export function TactiekTekeningEditorPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const bestaandId = id && id !== 'nieuw' ? Number(id) : null

  const [naam, setNaam] = useState('')
  const [tekening, setTekening] = useState<Tekening>(LEGE_TEKENING)
  const [spelers, setSpelers] = useState<Speler[]>([])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [geladen, setGeladen] = useState(!bestaandId)

  useEffect(() => {
    api.spelers.list().then(setSpelers)
  }, [])

  useEffect(() => {
    if (!bestaandId) return
    api.tactieken.get(bestaandId).then((t) => {
      setNaam(t.naam)
      if (t.tekening) setTekening(t.tekening)
      setGeladen(true)
    })
  }, [bestaandId])

  async function opslaan() {
    if (!naam.trim()) {
      setError('Geef de tekening een naam.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const data = { naam: naam.trim(), veldType: tekening.veldType, tekening }
      if (bestaandId) {
        await api.tactieken.update(bestaandId, data)
      } else {
        await api.tactieken.create(data)
      }
      navigate('/tactieken')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Opslaan mislukt.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <button className="terug" onClick={() => navigate('/tactieken')}>
        ← Tactieken
      </button>
      <div className="pagina-header">
        <div>
          <div className="eyebrow">Tactiek</div>
          <h2>{bestaandId ? 'Tekening bewerken' : 'Tekening maken'}</h2>
        </div>
      </div>

      <div className="kaart" style={{ marginBottom: 16 }}>
        <div className="form-groep">
          <label>Naam</label>
          <input value={naam} onChange={(e) => setNaam(e.target.value)} placeholder="bijv. Standaard aanval, Pressing, Counter…" />
        </div>
      </div>

      {geladen && (
        <div className="kaart" style={{ marginBottom: 16 }}>
          <TekenBord value={tekening} onChange={setTekening} pdfNaam={naam || 'Tactiek'} spelers={spelers} />
        </div>
      )}

      {error && <p className="form-error">{error}</p>}
      <div className="form-acties">
        <button className="knop lijn" onClick={() => navigate('/tactieken')}>
          Annuleren
        </button>
        <button className="knop" onClick={opslaan} disabled={saving}>
          {saving ? 'Bezig…' : 'Opslaan'}
        </button>
      </div>
    </div>
  )
}
