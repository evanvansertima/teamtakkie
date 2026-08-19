import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api, ApiError, type Speler, type Rapport } from '../../lib/api'
import { fcCategorieen, fcCategorieWaarde, fcOvr, ovrKleur, fcSterren, FC_STERREN, RAPPORT_SOORTEN, rapportVerschil, beschikbaarheidInfo } from '../../lib/fc'
import { SpelerForm } from './SpelerForm'

export function SpelerDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [speler, setSpeler] = useState<Speler | null>(null)
  const [tab, setTab] = useState<'profiel' | 'rapporten'>('profiel')
  const [formOpen, setFormOpen] = useState(false)

  function laad() {
    api.spelers.get(Number(id)).then(setSpeler)
  }
  useEffect(laad, [id])

  if (!speler) return <p>Laden…</p>

  const ovr = fcOvr(speler)
  const besch = beschikbaarheidInfo(speler.beschikbaar)

  async function verwijder() {
    if (!speler || !confirm(`${speler.naam} verwijderen uit de selectie?`)) return
    await api.spelers.remove(speler.id)
    navigate('/spelers')
  }

  return (
    <div>
      <button className="terug" onClick={() => navigate('/spelers')}>
        ← Spelers
      </button>
      <div className="pagina-header">
        <div>
          <div className="eyebrow">{speler.positie || 'Geen positie'}</div>
          <h2>
            {speler.rugnummer && <span className="sp-nr">#{speler.rugnummer}</span>}
            {speler.naam}
          </h2>
          <span className="sp-status" style={{ color: besch.kleur }}>
            {besch.label}
            {speler.beschikbaarNotitie ? ` — ${speler.beschikbaarNotitie}` : ''}
          </span>
        </div>
        {ovr !== null && (
          <span className="ovr-badge groot" style={{ color: ovrKleur(ovr) }}>
            {ovr}
          </span>
        )}
      </div>

      <div className="chip-rij" style={{ marginBottom: 16 }}>
        <button className={'chip' + (tab === 'profiel' ? ' actief' : '')} onClick={() => setTab('profiel')}>
          Profiel
        </button>
        <button className={'chip' + (tab === 'rapporten' ? ' actief' : '')} onClick={() => setTab('rapporten')}>
          Rapporten
        </button>
      </div>

      {tab === 'profiel' ? (
        <ProfielTab speler={speler} onEdit={() => setFormOpen(true)} onDelete={verwijder} />
      ) : (
        <RapportenTab speler={speler} onChanged={laad} />
      )}

      {formOpen && (
        <SpelerForm
          speler={speler}
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

function ProfielTab({ speler, onEdit, onDelete }: { speler: Speler; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="kaart">
      <div className="kaart-titel">Vaardigheden</div>
      {fcCategorieen(speler).map((cat) => {
        const w = fcCategorieWaarde(speler, cat)
        return (
          <div key={cat.id} className="fc-cat">
            <div className="fc-cat-kop">
              <span className="fc-cat-streep" style={{ background: cat.kleur }} />
              <span>{cat.label}</span>
              <span style={{ color: w ? ovrKleur(w) : undefined }}>{w ?? '–'}</span>
            </div>
          </div>
        )
      })}

      {FC_STERREN.map((s) => {
        const v = fcSterren(speler, s.id)
        return (
          <div key={s.id} className="fc-ster-rij">
            <span className="fc-rij-naam">{s.label}</span>
            <span>{v ? '★'.repeat(v) + '☆'.repeat(5 - v) : '–'}</span>
          </div>
        )
      })}

      <div className="kaart-titel" style={{ marginTop: 20 }}>
        Gegevens
      </div>
      <dl className="gegevens-lijst">
        {speler.geboortedatum && (
          <>
            <dt>Geboortedatum</dt>
            <dd>{speler.geboortedatum}</dd>
          </>
        )}
        {speler.favorietBeen && (
          <>
            <dt>Favoriet been</dt>
            <dd>{speler.favorietBeen}</dd>
          </>
        )}
        {speler.telefoon && (
          <>
            <dt>Telefoon</dt>
            <dd>{speler.telefoon}</dd>
          </>
        )}
        {speler.email && (
          <>
            <dt>E-mail</dt>
            <dd>{speler.email}</dd>
          </>
        )}
        {speler.adres && (
          <>
            <dt>Adres</dt>
            <dd>{speler.adres}</dd>
          </>
        )}
      </dl>

      <div className="form-acties">
        <button className="knop lijn" onClick={onEdit}>
          Bewerken
        </button>
        <button className="knop gevaar" onClick={onDelete}>
          Verwijderen
        </button>
      </div>
    </div>
  )
}

function RapportenTab({ speler, onChanged }: { speler: Speler; onChanged: () => void }) {
  const [seizoen, setSeizoen] = useState('2026/27')
  const [bewerk, setBewerk] = useState<{ soort: string; tekst: string; bestaand?: Rapport } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const alle = speler.rapporten ?? []
  const seizoenen = Array.from(new Set(alle.map((r) => r.seizoen)))
  if (!seizoenen.includes(seizoen)) seizoenen.push(seizoen)
  seizoenen.sort().reverse()

  const dezeSeizoen = RAPPORT_SOORTEN.map((soort) => ({
    soort,
    rapport: alle.find((r) => r.seizoen === seizoen && r.soort === soort.id) ?? null,
  }))
  const ingevuld = dezeSeizoen.filter((x) => x.rapport)
  const verschil =
    ingevuld.length > 1 ? rapportVerschil(ingevuld[0].rapport, ingevuld[ingevuld.length - 1].rapport) : []

  async function bewaar() {
    if (!bewerk) return
    setError(null)
    try {
      const payload = {
        seizoen,
        soort: bewerk.soort as Rapport['soort'],
        tekst: bewerk.tekst,
        positie: speler.positie ?? undefined,
        skills: speler.skills,
        sterren: speler.sterren,
        ovr: fcOvr(speler) ?? undefined,
      }
      if (bewerk.bestaand) {
        await api.rapporten.update(bewerk.bestaand.id, payload)
      } else {
        await api.rapporten.create(speler.id, payload)
      }
      setBewerk(null)
      onChanged()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Opslaan mislukt.')
    }
  }

  return (
    <div className="kaart">
      <div className="kaart-titel" style={{ justifyContent: 'space-between' }}>
        <span>Rapporten</span>
        <select value={seizoen} onChange={(e) => setSeizoen(e.target.value)}>
          {seizoenen.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="rap-raster">
        {dezeSeizoen.map((x) => (
          <div key={x.soort.id} className={'rap-kaart' + (x.rapport ? ' gevuld' : '')}>
            <div className="rap-kop">
              <span className="rap-icoon" style={{ background: x.soort.kleur }} />
              <div>
                <div className="rap-naam">{x.soort.label}</div>
                <div className="rap-datum">
                  {x.rapport ? new Date(x.rapport.createdAt).toLocaleDateString('nl-NL') : 'nog niet gemaakt'}
                </div>
              </div>
              {x.rapport && (
                <span className="ovr-badge" style={{ color: x.rapport.ovr ? ovrKleur(x.rapport.ovr) : undefined }}>
                  {x.rapport.ovr ?? '–'}
                </span>
              )}
            </div>
            {x.rapport?.tekst && <p className="rap-tekst">{x.rapport.tekst}</p>}
            <button
              className="knop lijn klein"
              onClick={() => setBewerk({ soort: x.soort.id, tekst: x.rapport?.tekst ?? '', bestaand: x.rapport ?? undefined })}
            >
              {x.rapport ? 'Bewerken' : 'Maken'}
            </button>
          </div>
        ))}
      </div>

      {verschil.length > 0 && (
        <>
          <div className="kaart-titel" style={{ marginTop: 20 }}>
            Groei dit seizoen
          </div>
          {verschil.map((v) => (
            <div key={v.cat.id} className="fc-cat">
              <div className="fc-cat-kop">
                <span className="fc-cat-streep" style={{ background: v.cat.kleur }} />
                <span>{v.cat.label}</span>
                <span>
                  {v.van ?? '–'} → {v.tot ?? '–'}
                  {v.groei !== null && (
                    <span style={{ color: v.groei >= 0 ? '#22c55e' : '#ef4444' }}>
                      {' '}
                      ({v.groei >= 0 ? '+' : ''}
                      {v.groei})
                    </span>
                  )}
                </span>
              </div>
            </div>
          ))}
        </>
      )}

      {bewerk && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setBewerk(null)}>
          <div className="modal-sheet">
            <div className="modal-titel">{RAPPORT_SOORTEN.find((s) => s.id === bewerk.soort)?.label}</div>
            <p className="form-hint">Legt de huidige vaardigheden van {speler.naam} vast als momentopname.</p>
            <textarea
              rows={6}
              value={bewerk.tekst}
              onChange={(e) => setBewerk({ ...bewerk, tekst: e.target.value })}
              placeholder="Opmerkingen…"
            />
            {error && <p className="form-error">{error}</p>}
            <div className="form-acties">
              <button className="knop lijn" onClick={() => setBewerk(null)}>
                Annuleren
              </button>
              <button className="knop" onClick={bewaar}>
                Opslaan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
