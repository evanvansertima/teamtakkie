import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api, type Wedstrijd, type Liveevent, type Speler } from '../../lib/api'
import { ACTIE_CATEGORIEEN, actieInfo } from '../../lib/liveActions'

function formatTijd(sec: number) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`
}

export function LiveSessionPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [wedstrijd, setWedstrijd] = useState<Wedstrijd | null>(null)
  const [events, setEvents] = useState<Liveevent[] | null>(null)
  const [spelers, setSpelers] = useState<Speler[]>([])
  const [loopt, setLoopt] = useState(false)
  const [seconden, setSeconden] = useState(0)
  const [gekozenSpelerId, setGekozenSpelerId] = useState('')
  const [afronden, setAfronden] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    api.wedstrijden.get(Number(id)).then(setWedstrijd)
    api.liveevents.list(Number(id)).then(setEvents)
    api.spelers.list().then(setSpelers)
  }, [id])

  useEffect(() => {
    if (loopt) {
      timerRef.current = setInterval(() => setSeconden((s) => s + 1), 1000)
    } else if (timerRef.current) {
      clearInterval(timerRef.current)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [loopt])

  if (!wedstrijd || !events) return <p>Laden…</p>

  const huidigMinuut = Math.floor(seconden / 60) + 1
  const fchGoals = events.filter((e) => e.type === 'goal').length
  const tegGoals = events.filter((e) => e.type === 'goal-teg').length

  async function log(type: string, meestuurSpeler: boolean) {
    if (!wedstrijd) return
    const spelerId = meestuurSpeler && gekozenSpelerId ? Number(gekozenSpelerId) : undefined
    const event = await api.liveevents.create(wedstrijd.id, { type, minuut: huidigMinuut, spelerId })
    setEvents((evs) => [event, ...(evs ?? [])])
  }

  async function verwijder(eventId: number) {
    await api.liveevents.remove(eventId)
    setEvents((evs) => (evs ?? []).filter((e) => e.id !== eventId))
  }

  async function rondAf() {
    if (!wedstrijd || !events) return
    setAfronden(true)
    try {
      for (const e of events) {
        if (e.type === 'goal' && e.spelerId) {
          await api.doelpunten.create(wedstrijd.id, { scorerSpelerId: e.spelerId, minuut: e.minuut ?? undefined })
        }
        if ((e.type === 'geel' || e.type === 'rood') && e.spelerId) {
          await api.kaarten.create(wedstrijd.id, { spelerId: e.spelerId, type: e.type, minuut: e.minuut ?? undefined })
        }
      }
      await api.wedstrijden.update(wedstrijd.id, {
        tegenstander: wedstrijd.tegenstander,
        datum: wedstrijd.datum.slice(0, 10),
        thuis: wedstrijd.thuis,
        status: 'gespeeld',
        score: { fch: fchGoals, teg: tegGoals },
      })
      navigate(`/wedstrijden/${wedstrijd.id}`)
    } finally {
      setAfronden(false)
    }
  }

  return (
    <div>
      <button className="terug" onClick={() => navigate('/live')}>
        ← Live Analyse
      </button>
      <div className="pagina-header">
        <div>
          <div className="eyebrow">{wedstrijd.thuis ? 'Thuis' : 'Uit'}</div>
          <h2>{wedstrijd.tegenstander}</h2>
        </div>
        <span className="ovr-badge groot">
          {fchGoals}–{tegGoals}
        </span>
      </div>

      <div className="kaart" style={{ marginBottom: 16 }}>
        <div className="chip-rij" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="ovr-badge groot">{formatTijd(seconden)}</span>
            <span className="rap-datum">{huidigMinuut}e minuut</span>
          </div>
          <div className="chip-rij">
            <button className="knop" onClick={() => setLoopt(!loopt)}>
              {loopt ? 'Pauze' : 'Start'}
            </button>
            <button
              className="knop lijn"
              onClick={() => {
                setLoopt(false)
                setSeconden(0)
              }}
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      <div className="kaart" style={{ marginBottom: 16 }}>
        <div className="form-groep">
          <label>Actie voor speler (optioneel)</label>
          <select value={gekozenSpelerId} onChange={(e) => setGekozenSpelerId(e.target.value)}>
            <option value="">Geen speler</option>
            {spelers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.naam}
              </option>
            ))}
          </select>
        </div>
      </div>

      {ACTIE_CATEGORIEEN.map((cat) => (
        <div key={cat.id} className="kaart" style={{ marginBottom: 16 }}>
          <div className="kaart-titel">
            <span className="fc-cat-streep" style={{ background: cat.kleur }} />
            {cat.label}
          </div>
          <div className="chip-rij">
            {cat.acties.map((a) => (
              <button key={a.type} className="chip" onClick={() => log(a.type, !!a.speler)}>
                {a.label}
              </button>
            ))}
          </div>
        </div>
      ))}

      <div className="kaart">
        <div className="kaart-titel">Events ({events.length})</div>
        {events.length === 0 && <p className="form-hint">Nog geen events gelogd.</p>}
        {events.map((e) => {
          const info = actieInfo(e.type)
          return (
            <div key={e.id} className="sp-rij">
              <span className="sp-naam">
                {info.label}
                {e.speler ? ` — ${e.speler.naam}` : ''}
                {e.minuut ? ` (${e.minuut}')` : ''}
              </span>
              <button className="knop lijn klein" onClick={() => verwijder(e.id)}>
                ×
              </button>
            </div>
          )
        })}
      </div>

      <div className="form-acties">
        <button className="knop" onClick={rondAf} disabled={afronden}>
          {afronden ? 'Bezig…' : 'Wedstrijd afronden'}
        </button>
      </div>
    </div>
  )
}
