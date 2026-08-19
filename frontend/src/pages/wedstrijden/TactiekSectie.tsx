import { useEffect, useState } from 'react'
import { api, ApiError, type Wedstrijd, type Speler, type Tactiekplan } from '../../lib/api'
import { FORMATIES } from '../../lib/formaties'
import { ROL_VOLGORDE } from '../../lib/fc'
import { LEGE_TEKENING, type Tekening } from '../../lib/tekenbord/types'
import { TekenBord } from '../../components/TekenBord'

const FASES = [
  { id: 'plan', label: 'Wedstrijdplan', hint: 'Bijv. de eerste 5 minuten vol druk, daarna inzakken en via de counter de aanval zoeken.' },
  { id: 'balbezit', label: 'In balbezit', hint: 'Hoe bouwen we op, waar zoeken we de ruimte?' },
  { id: 'balverlies', label: 'Bij balverlies', hint: 'Waar zetten we druk, wanneer zakken we in?' },
  { id: 'omschakeling', label: 'Omschakeling', hint: 'Wat doen we in de eerste seconden na balverlies of balverovering?' },
] as const

const TAAK_IDEEEN: Record<string, { aanval: string[]; verdediging: string[] }> = {
  Keeper: {
    aanval: ['Rustig opbouwen van achteruit', 'Zoek de vrije man op de flank', 'Snel inspelen na een redding'],
    verdediging: ['Coach je verdediging hardop', 'Kom eruit bij ballen achter de linie', 'Sta hoog mee als wij druk zetten'],
  },
  Verdediger: {
    aanval: ['Opkomende vleugelverdediger, speel hoog in balbezit', 'Kies voor de veilige pass naar binnen', 'Zoek de diepe bal over de linie'],
    verdediging: ['Bij balverlies kort op je directe man', 'Knijp naar binnen als de bal aan de andere kant is', 'Houd de linie strak, geen gaten'],
  },
  Middenvelder: {
    aanval: ['Vraag de bal tussen de linies', 'Loop mee in de zestien bij een voorzet', 'Wissel het spel snel naar de andere kant'],
    verdediging: ['Sluit de ruimte voor de verdediging', 'Jaag de balbezitter op', 'Blijf achter de bal als wij aanvallen'],
  },
  Aanvaller: {
    aanval: ['Blijf op de laatste man', 'Zoek de diepte achter de verdediging', 'Kom kort en leg af'],
    verdediging: ['Zet de eerste druk op de opbouw', 'Stuur de tegenstander naar de zijlijn', 'Sluit de bal terug naar de keeper af'],
  },
}
function taakIdeeen(speler: Speler) {
  return (speler.positie && TAAK_IDEEEN[speler.positie]) || TAAK_IDEEEN.Middenvelder
}

export function TactiekSectie({ wedstrijd, spelers }: { wedstrijd: Wedstrijd; spelers: Speler[] }) {
  const [plan, setPlan] = useState<Tactiekplan | null>(null)
  const [geladen, setGeladen] = useState(false)
  const [meerFases, setMeerFases] = useState(false)
  const [tekst, setTekst] = useState<Record<string, string>>({})
  const [tekenOpen, setTekenOpen] = useState(false)
  const [tekeningDraft, setTekeningDraft] = useState<Tekening>(LEGE_TEKENING)
  const [gekozenId, setGekozenId] = useState<number | null>(null)
  const [aanval, setAanval] = useState('')
  const [verdediging, setVerdediging] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.tactiekplannen.get(wedstrijd.id).then((p) => {
      setPlan(p ?? null)
      setGeladen(true)
    })
  }, [wedstrijd.id])

  useEffect(() => {
    setTekst({
      plan: plan?.plan ?? '',
      balbezit: plan?.balbezit ?? '',
      balverlies: plan?.balverlies ?? '',
      omschakeling: plan?.omschakeling ?? '',
    })
  }, [plan])

  const opstelling = wedstrijd.opstellingrijen ?? []
  const instructies = plan?.instructies ?? {}
  const shape = wedstrijd.formatie && FORMATIES[wedstrijd.formatie] ? wedstrijd.formatie : Object.keys(FORMATIES)[0]
  const posities = FORMATIES[shape] ?? []

  function spelerVoorPositie(positieId: string) {
    const rij = opstelling.find((o) => o.positieId === positieId && o.spelStatus === 'basis')
    return rij ? spelers.find((s) => s.id === rij.spelerId) : undefined
  }
  const basisIds = new Set(posities.map((p) => spelerVoorPositie(p.id)?.id).filter((id): id is number => id != null))
  const bank = spelers.filter((s) => {
    if (basisIds.has(s.id)) return false
    const rij = opstelling.find((o) => o.spelerId === s.id)
    return rij && rij.spelStatus !== 'afwezig'
  })
  const metTaak = spelers.filter((s) => {
    const t = instructies[s.id]
    return t && ((t.aanval ?? '').trim() || (t.verdediging ?? '').trim())
  })
  const alleOpdrachten = [...metTaak].sort((a, b) => {
    const ra = (ROL_VOLGORDE as string[]).indexOf(a.positie ?? '')
    const rb = (ROL_VOLGORDE as string[]).indexOf(b.positie ?? '')
    if ((ra < 0 ? 99 : ra) !== (rb < 0 ? 99 : rb)) return (ra < 0 ? 99 : ra) - (rb < 0 ? 99 : rb)
    return (Number(a.rugnummer) || 99) - (Number(b.rugnummer) || 99)
  })

  async function opslaanVeld(veldId: string, waarde: string) {
    try {
      const bijgewerkt = await api.tactiekplannen.upsert(wedstrijd.id, { [veldId]: waarde })
      setPlan(bijgewerkt)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Opslaan mislukt.')
    }
  }

  function openTekenen() {
    setTekeningDraft(plan?.tekening ?? { ...LEGE_TEKENING, veldType: plan?.veldType ?? 'heel-h' })
    setTekenOpen(true)
  }

  async function sluitTekenen() {
    try {
      const bijgewerkt = await api.tactiekplannen.upsert(wedstrijd.id, { tekening: tekeningDraft, veldType: tekeningDraft.veldType })
      setPlan(bijgewerkt)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Opslaan mislukt.')
    }
    setTekenOpen(false)
  }

  async function verwijderTekening() {
    try {
      const bijgewerkt = await api.tactiekplannen.upsert(wedstrijd.id, { tekening: null })
      setPlan(bijgewerkt)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Verwijderen mislukt.')
    }
  }

  function openSpeler(speler: Speler) {
    const t = instructies[speler.id]
    setAanval(t?.aanval ?? '')
    setVerdediging(t?.verdediging ?? '')
    setGekozenId(speler.id)
  }

  async function bewaarTaken() {
    if (gekozenId === null) return
    const nieuw = { ...instructies }
    const a = aanval.trim(),
      v = verdediging.trim()
    if (a || v) nieuw[gekozenId] = { aanval: a, verdediging: v }
    else delete nieuw[gekozenId]
    try {
      const bijgewerkt = await api.tactiekplannen.upsert(wedstrijd.id, { instructies: nieuw })
      setPlan(bijgewerkt)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Opslaan mislukt.')
    }
    setGekozenId(null)
  }

  async function wisTaken() {
    if (gekozenId === null) return
    const nieuw = { ...instructies }
    delete nieuw[gekozenId]
    try {
      const bijgewerkt = await api.tactiekplannen.upsert(wedstrijd.id, { instructies: nieuw })
      setPlan(bijgewerkt)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Wissen mislukt.')
    }
    setGekozenId(null)
  }

  if (!geladen) return null

  const gekozenSpeler = gekozenId !== null ? spelers.find((s) => s.id === gekozenId) : null
  const ideeen = gekozenSpeler ? taakIdeeen(gekozenSpeler) : null

  return (
    <>
      <div className="kaart-titel" style={{ justifyContent: 'space-between' }}>
        <span>Tactiek</span>
        <span className="rap-datum">{metTaak.length > 0 ? `${metTaak.length} spelers met een opdracht` : 'nog geen opdrachten'}</span>
      </div>

      {FASES.filter((f) => f.id === 'plan' || meerFases || (tekst[f.id] || '').trim()).map((f) => (
        <div key={f.id} className="form-groep">
          <label>{f.label}</label>
          <textarea
            rows={2}
            value={tekst[f.id] || ''}
            placeholder={f.hint}
            onChange={(e) => setTekst((o) => ({ ...o, [f.id]: e.target.value }))}
            onBlur={(e) => opslaanVeld(f.id, e.target.value)}
          />
        </div>
      ))}
      {!meerFases && FASES.some((f) => f.id !== 'plan' && !(tekst[f.id] || '').trim()) && (
        <button className="knop lijn klein" style={{ width: '100%', justifyContent: 'center', marginBottom: 12 }} onClick={() => setMeerFases(true)}>
          + Balbezit, balverlies en omschakeling
        </button>
      )}

      <div className="form-groep">
        <label>Tactische tekening</label>
        {tekenOpen ? (
          <div>
            <TekenBord value={tekeningDraft} onChange={setTekeningDraft} pdfNaam={`Tactiek ${wedstrijd.tegenstander}`} spelers={spelers} />
            <button className="knop succes" style={{ width: '100%', justifyContent: 'center', marginTop: 10 }} onClick={sluitTekenen}>
              ✓ Klaar met tekenen
            </button>
          </div>
        ) : (
          <div className="chip-rij">
            <button className="knop lijn klein" style={{ flex: '1 1 180px', justifyContent: 'center' }} onClick={openTekenen}>
              {plan?.tekening ? 'Tekening aanpassen' : 'Tekening maken'}
            </button>
            {plan?.tekening && (
              <button className="knop gevaar klein" onClick={verwijderTekening} title="Tekening verwijderen">
                🗑
              </button>
            )}
          </div>
        )}
      </div>

      <div className="form-groep">
        <label>Opdracht per speler</label>
        {posities.length === 0 || basisIds.size === 0 ? (
          <p className="form-hint">Stel eerst je basisopstelling samen, dan kun je hier per speler een opdracht geven.</p>
        ) : (
          <>
            <p className="form-hint">Tik een speler aan op het veld. Een oranje stip betekent dat hij al een opdracht heeft.</p>
            <div className="veld">
              {posities.map((p) => {
                const sp = spelerVoorPositie(p.id)
                const heeft = sp && instructies[sp.id] && ((instructies[sp.id].aanval ?? '').trim() || (instructies[sp.id].verdediging ?? '').trim())
                return (
                  <button
                    key={p.id}
                    type="button"
                    className={'veld-positie' + (sp ? ' bezet' : '')}
                    style={{ left: `${p.x}%`, top: `${p.y}%`, boxShadow: heeft ? '0 0 0 3px #fd7e14' : undefined }}
                    disabled={!sp}
                    onClick={() => sp && openSpeler(sp)}
                  >
                    {sp ? (sp.rugnummer ? `#${sp.rugnummer}` : sp.naam.charAt(0)) : p.label}
                  </button>
                )
              })}
            </div>
          </>
        )}

        {bank.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div className="form-hint" style={{ marginBottom: 7 }}>
              Wissels
            </div>
            <div className="chip-rij">
              {bank.map((s) => {
                const t = instructies[s.id]
                const heeft = t && ((t.aanval ?? '').trim() || (t.verdediging ?? '').trim())
                return (
                  <button key={s.id} className="knop lijn klein" style={{ borderColor: heeft ? '#fd7e14' : undefined }} onClick={() => openSpeler(s)}>
                    {heeft ? '● ' : ''}
                    {(s.rugnummer ? `#${s.rugnummer} ` : '') + s.naam.split(' ')[0]}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {alleOpdrachten.length > 0 && (
        <div className="form-groep">
          <label>Alle opdrachten</label>
          <div className="sp-lijst">
            {alleOpdrachten.map((s) => {
              const t = instructies[s.id]
              return (
                <div key={s.id} className="sp-rij" onClick={() => openSpeler(s)} style={{ cursor: 'pointer', display: 'block', padding: '10px 12px' }}>
                  <div style={{ fontWeight: 700 }}>{(s.rugnummer ? `#${s.rugnummer} ` : '') + s.naam}</div>
                  {t?.aanval && <div style={{ fontSize: 12, color: '#28a745' }}>↑ {t.aanval}</div>}
                  {t?.verdediging && <div style={{ fontSize: 12, color: '#dc3545' }}>🛡 {t.verdediging}</div>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {error && <p className="form-error">{error}</p>}

      {gekozenSpeler && ideeen && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setGekozenId(null)}>
          <div className="modal-sheet">
            <div className="modal-titel">
              {(gekozenSpeler.rugnummer ? `#${gekozenSpeler.rugnummer} ` : '') + gekozenSpeler.naam}
            </div>
            <div className="form-groep">
              <label style={{ color: '#28a745' }}>↑ Aanvallende opdracht</label>
              <textarea
                rows={2}
                value={aanval}
                placeholder="bijv. Opkomende vleugelverdediger, speel hoog in balbezit"
                onChange={(e) => setAanval(e.target.value)}
              />
              <div className="chip-rij" style={{ marginTop: 6 }}>
                {ideeen.aanval.map((tip) => (
                  <button key={tip} className="chip" onClick={() => setAanval(tip)}>
                    {tip}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-groep">
              <label style={{ color: '#dc3545' }}>🛡 Verdedigende opdracht</label>
              <textarea
                rows={2}
                value={verdediging}
                placeholder="bijv. Bij balverlies kort op je directe man gaan staan"
                onChange={(e) => setVerdediging(e.target.value)}
              />
              <div className="chip-rij" style={{ marginTop: 6 }}>
                {ideeen.verdediging.map((tip) => (
                  <button key={tip} className="chip" onClick={() => setVerdediging(tip)}>
                    {tip}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-acties">
              <button className="knop gevaar klein" onClick={wisTaken} title="Opdrachten wissen">
                🗑
              </button>
              <button className="knop lijn" onClick={() => setGekozenId(null)}>
                Annuleren
              </button>
              <button className="knop" onClick={bewaarTaken}>
                ✓ Opslaan
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
