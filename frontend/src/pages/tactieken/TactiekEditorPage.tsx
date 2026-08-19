import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api, ApiError, type Speler } from '../../lib/api'
import { FORMATIES, FORMATIE_NAMEN } from '../../lib/formaties'

export function TactiekEditorPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const bestaandId = id && id !== 'nieuw' ? Number(id) : null

  const [naam, setNaam] = useState('')
  const [shape, setShape] = useState(FORMATIE_NAMEN[0])
  const [toewijzing, setToewijzing] = useState<Record<string, number>>({})
  const [spelers, setSpelers] = useState<Speler[]>([])
  const [actievePositie, setActievePositie] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.spelers.list().then(setSpelers)
  }, [])

  useEffect(() => {
    if (!bestaandId) return
    api.formaties.list().then((all) => {
      const f = all.find((x) => x.id === bestaandId)
      if (f) {
        setNaam(f.naam)
        setShape(f.formatie)
        setToewijzing(f.toewijzing ?? {})
      }
    })
  }, [bestaandId])

  const posities = FORMATIES[shape] ?? []

  function wijsToe(positieId: string, spelerId: string) {
    setToewijzing((t) => {
      const next = { ...t }
      if (spelerId) {
        next[positieId] = Number(spelerId)
      } else {
        delete next[positieId]
      }
      return next
    })
    setActievePositie(null)
  }

  async function opslaan() {
    if (!naam.trim()) {
      setError('Geef de formatie een naam.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      if (bestaandId) {
        await api.formaties.update(bestaandId, { naam, formatie: shape, toewijzing })
      } else {
        await api.formaties.create({ naam, formatie: shape, toewijzing })
      }
      navigate('/tactieken')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Opslaan mislukt.')
    } finally {
      setSaving(false)
    }
  }

  function spelerVoor(positieId: string): Speler | undefined {
    const sid = toewijzing[positieId]
    return sid ? spelers.find((s) => s.id === sid) : undefined
  }

  return (
    <div>
      <button className="terug" onClick={() => navigate('/tactieken')}>
        ← Formaties
      </button>
      <div className="pagina-header">
        <div>
          <div className="eyebrow">Tactiek</div>
          <h2>{bestaandId ? 'Formatie bewerken' : 'Formatie maken'}</h2>
        </div>
      </div>

      <div className="kaart" style={{ marginBottom: 16 }}>
        <div className="form-rij">
          <div className="form-groep">
            <label>Naam</label>
            <input value={naam} onChange={(e) => setNaam(e.target.value)} placeholder="bijv. Basisopstelling" />
          </div>
          <div className="form-groep">
            <label>Formatie</label>
            <select
              value={shape}
              onChange={(e) => {
                setShape(e.target.value)
                setToewijzing({})
              }}
            >
              {FORMATIE_NAMEN.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="kaart" style={{ marginBottom: 16 }}>
        <div className="veld">
          {posities.map((p) => {
            const sp = spelerVoor(p.id)
            return (
              <button
                key={p.id}
                type="button"
                className={'veld-positie' + (sp ? ' bezet' : '') + (actievePositie === p.id ? ' actief' : '')}
                style={{ left: `${p.x}%`, top: `${p.y}%` }}
                onClick={() => setActievePositie(actievePositie === p.id ? null : p.id)}
              >
                {sp ? (sp.rugnummer ? `#${sp.rugnummer}` : sp.naam.charAt(0)) : p.label}
              </button>
            )
          })}
        </div>
      </div>

      {actievePositie && (
        <div className="kaart" style={{ marginBottom: 16 }}>
          <div className="kaart-titel">
            Wie speelt op {FORMATIES[shape]?.find((p) => p.id === actievePositie)?.label}?
          </div>
          <select
            value={toewijzing[actievePositie] ?? ''}
            onChange={(e) => wijsToe(actievePositie, e.target.value)}
          >
            <option value="">Niemand</option>
            {spelers.map((s) => (
              <option key={s.id} value={s.id}>
                {(s.rugnummer ? `#${s.rugnummer} ` : '') + s.naam}
              </option>
            ))}
          </select>
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
