import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api, type Wedstrijd, type WedstrijdInput, type Speler } from '../../lib/api'
import { WedstrijdForm } from './WedstrijdForm'

export function WedstrijdDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [wedstrijd, setWedstrijd] = useState<Wedstrijd | null>(null)
  const [spelers, setSpelers] = useState<Speler[]>([])
  const [formOpen, setFormOpen] = useState(false)

  function laad() {
    api.wedstrijden.get(Number(id)).then(setWedstrijd)
  }
  useEffect(laad, [id])
  useEffect(() => {
    api.spelers.list().then(setSpelers)
  }, [])

  if (!wedstrijd) return <p>Laden…</p>

  const datum = new Date(wedstrijd.datum).toLocaleDateString('nl-NL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  // The update endpoint validates a full match record (tegenstander/datum/thuis
  // required), matching how WedstrijdForm always submits the whole form. These
  // quick in-place edits only change one field, so merge over the current
  // record's required fields rather than sending a bare partial patch.
  async function patch(wijziging: WedstrijdInput) {
    if (!wedstrijd) return
    const bijgewerkt = await api.wedstrijden.update(wedstrijd.id, {
      tegenstander: wedstrijd.tegenstander,
      datum: wedstrijd.datum.slice(0, 10),
      tijd: wedstrijd.tijd ?? undefined,
      locatie: wedstrijd.locatie ?? undefined,
      thuis: wedstrijd.thuis,
      status: wedstrijd.status,
      score: wedstrijd.score ?? undefined,
      motmSpelerId: wedstrijd.motmSpelerId ?? undefined,
      formatie: wedstrijd.formatie ?? undefined,
      speelduur: wedstrijd.speelduur ?? undefined,
      notities: wedstrijd.notities ?? undefined,
      ...wijziging,
    })
    setWedstrijd(bijgewerkt)
  }

  function markeerGespeeld() {
    return patch({ status: 'gespeeld', score: { fch: 0, teg: 0 } })
  }

  function zetScore(kant: 'fch' | 'teg', delta: number) {
    if (!wedstrijd) return
    const score = { fch: wedstrijd.score?.fch ?? 0, teg: wedstrijd.score?.teg ?? 0 }
    score[kant] = Math.max(0, score[kant] + delta)
    return patch({ score })
  }

  function zetMotm(spelerId: string) {
    return patch({ motmSpelerId: spelerId ? Number(spelerId) : undefined })
  }

  async function verwijder() {
    if (!wedstrijd || !confirm(`Wedstrijd tegen ${wedstrijd.tegenstander} verwijderen?`)) return
    await api.wedstrijden.remove(wedstrijd.id)
    navigate('/wedstrijden')
  }

  return (
    <div>
      <button className="terug" onClick={() => navigate('/wedstrijden')}>
        ← Wedstrijden
      </button>
      <div className="pagina-header">
        <div>
          <div className="eyebrow">{wedstrijd.thuis ? 'Thuis' : 'Uit'}</div>
          <h2>{wedstrijd.tegenstander}</h2>
          <p>
            {datum}
            {wedstrijd.tijd ? ` — ${wedstrijd.tijd}` : ''}
            {wedstrijd.locatie ? ` — ${wedstrijd.locatie}` : ''}
          </p>
        </div>
        {wedstrijd.status === 'gespeeld' && wedstrijd.score && (
          <span className="ovr-badge groot">
            {wedstrijd.score.fch ?? 0}–{wedstrijd.score.teg ?? 0}
          </span>
        )}
      </div>

      {wedstrijd.status === 'gepland' ? (
        <div className="kaart">
          <p className="form-hint">Deze wedstrijd is nog niet gespeeld.</p>
          <button className="knop" onClick={markeerGespeeld}>
            Markeer als gespeeld
          </button>
        </div>
      ) : (
        <div className="kaart">
          <div className="kaart-titel">Uitslag</div>
          <div className="score-invoer">
            <ScoreTeller label="Wij" waarde={wedstrijd.score?.fch ?? 0} onWijzig={(d) => zetScore('fch', d)} />
            <span>–</span>
            <ScoreTeller label={wedstrijd.tegenstander} waarde={wedstrijd.score?.teg ?? 0} onWijzig={(d) => zetScore('teg', d)} />
          </div>

          <div className="kaart-titel" style={{ marginTop: 20 }}>
            Man of the match
          </div>
          <select value={wedstrijd.motmSpelerId ?? ''} onChange={(e) => zetMotm(e.target.value)}>
            <option value="">Geen</option>
            {spelers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.naam}
              </option>
            ))}
          </select>

          <DoelpuntenSectie wedstrijd={wedstrijd} spelers={spelers} onChanged={laad} />
          <KaartenSectie wedstrijd={wedstrijd} spelers={spelers} onChanged={laad} />
        </div>
      )}

      <div className="form-acties">
        <button className="knop lijn" onClick={() => setFormOpen(true)}>
          Bewerken
        </button>
        <button className="knop gevaar" onClick={verwijder}>
          Verwijderen
        </button>
      </div>

      {formOpen && (
        <WedstrijdForm
          wedstrijd={wedstrijd}
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

function ScoreTeller({ label, waarde, onWijzig }: { label: string; waarde: number; onWijzig: (delta: number) => void }) {
  return (
    <div className="score-blok">
      <div className="rap-datum">{label}</div>
      <div className="chip-rij" style={{ alignItems: 'center' }}>
        <button className="chip" onClick={() => onWijzig(-1)}>
          −
        </button>
        <span className="ovr-badge groot">{waarde}</span>
        <button className="chip" onClick={() => onWijzig(1)}>
          +
        </button>
      </div>
    </div>
  )
}

function DoelpuntenSectie({ wedstrijd, spelers, onChanged }: { wedstrijd: Wedstrijd; spelers: Speler[]; onChanged: () => void }) {
  const [kiezer, setKiezer] = useState(false)
  const [scorerSpelerId, setScorerSpelerId] = useState('')
  const [minuut, setMinuut] = useState('')

  async function voegToe() {
    if (!scorerSpelerId) return
    await api.doelpunten.create(wedstrijd.id, {
      scorerSpelerId: Number(scorerSpelerId),
      minuut: minuut ? Number(minuut) : undefined,
    })
    setKiezer(false)
    setScorerSpelerId('')
    setMinuut('')
    onChanged()
  }

  async function verwijder(id: number) {
    await api.doelpunten.remove(id)
    onChanged()
  }

  return (
    <>
      <div className="kaart-titel" style={{ marginTop: 20 }}>
        Doelpunten
      </div>
      {(wedstrijd.doelpunten ?? []).length === 0 && <p className="form-hint">Nog geen doelpuntenmakers.</p>}
      {(wedstrijd.doelpunten ?? []).map((d) => (
        <div key={d.id} className="sp-rij">
          <span className="sp-naam">
            {d.scorerSpeler?.naam}
            {d.minuut ? ` (${d.minuut}')` : ''}
          </span>
          <button className="knop lijn klein" onClick={() => verwijder(d.id)}>
            ×
          </button>
        </div>
      ))}
      {kiezer ? (
        <div className="chip-rij">
          <select value={scorerSpelerId} onChange={(e) => setScorerSpelerId(e.target.value)}>
            <option value="" disabled>
              Wie scoorde?
            </option>
            {spelers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.naam}
              </option>
            ))}
          </select>
          <input
            type="number"
            placeholder="Minuut"
            style={{ width: 70 }}
            value={minuut}
            onChange={(e) => setMinuut(e.target.value)}
          />
          <button className="knop klein" onClick={voegToe} disabled={!scorerSpelerId}>
            Toevoegen
          </button>
          <button className="knop lijn klein" onClick={() => setKiezer(false)}>
            Annuleren
          </button>
        </div>
      ) : (
        <button className="knop lijn klein" onClick={() => setKiezer(true)} disabled={spelers.length === 0}>
          + Doelpunt toevoegen
        </button>
      )}
    </>
  )
}

function KaartenSectie({ wedstrijd, spelers, onChanged }: { wedstrijd: Wedstrijd; spelers: Speler[]; onChanged: () => void }) {
  const [kiezer, setKiezer] = useState<'geel' | 'rood' | null>(null)
  const [spelerId, setSpelerId] = useState('')
  const [minuut, setMinuut] = useState('')

  async function voegToe() {
    if (!kiezer || !spelerId) return
    await api.kaarten.create(wedstrijd.id, {
      spelerId: Number(spelerId),
      type: kiezer,
      minuut: minuut ? Number(minuut) : undefined,
    })
    setKiezer(null)
    setSpelerId('')
    setMinuut('')
    onChanged()
  }

  async function verwijder(id: number) {
    await api.kaarten.remove(id)
    onChanged()
  }

  return (
    <>
      <div className="kaart-titel" style={{ marginTop: 20 }}>
        Kaarten
      </div>
      {(wedstrijd.kaarten ?? []).length === 0 && <p className="form-hint">Geen kaarten.</p>}
      {(wedstrijd.kaarten ?? []).map((k) => (
        <div key={k.id} className="sp-rij">
          <span className="sp-naam">
            {k.type === 'geel' ? '🟨' : '🟥'} {k.speler?.naam}
            {k.minuut ? ` (${k.minuut}')` : ''}
          </span>
          <button className="knop lijn klein" onClick={() => verwijder(k.id)}>
            ×
          </button>
        </div>
      ))}
      {kiezer ? (
        <div className="chip-rij">
          <select value={spelerId} onChange={(e) => setSpelerId(e.target.value)}>
            <option value="" disabled>
              {kiezer === 'geel' ? 'Gele kaart voor?' : 'Rode kaart voor?'}
            </option>
            {spelers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.naam}
              </option>
            ))}
          </select>
          <input
            type="number"
            placeholder="Minuut"
            style={{ width: 70 }}
            value={minuut}
            onChange={(e) => setMinuut(e.target.value)}
          />
          <button className="knop klein" onClick={voegToe} disabled={!spelerId}>
            Toevoegen
          </button>
          <button className="knop lijn klein" onClick={() => setKiezer(null)}>
            Annuleren
          </button>
        </div>
      ) : (
        <div className="chip-rij">
          <button className="knop lijn klein" onClick={() => setKiezer('geel')} disabled={spelers.length === 0}>
            🟨 Gele kaart
          </button>
          <button className="knop lijn klein" onClick={() => setKiezer('rood')} disabled={spelers.length === 0}>
            🟥 Rode kaart
          </button>
        </div>
      )}
    </>
  )
}
