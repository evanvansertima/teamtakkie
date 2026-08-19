import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, type Wedstrijd, type Training, type Activiteit } from '../../lib/api'
import { activiteitOpDatum, activiteitSoort } from '../../lib/agenda'
import { ActiviteitForm } from './ActiviteitForm'

const MAANDEN = [
  'Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni',
  'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December',
]
const DAGEN = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo']

type CalEvent =
  | { type: 'wedstrijd'; label: string; tijd: string | null; item: Wedstrijd }
  | { type: 'training'; label: string; tijd: string | null; item: Training }
  | { type: 'activiteit'; label: string; tijd: string | null; item: Activiteit }

function datumSleutel(jaar: number, maand: number, dag: number) {
  return `${jaar}-${String(maand + 1).padStart(2, '0')}-${String(dag).padStart(2, '0')}`
}

export function AgendaPage() {
  const vandaag = new Date()
  const [jaar, setJaar] = useState(vandaag.getFullYear())
  const [maand, setMaand] = useState(vandaag.getMonth())
  const [gekozenDag, setGekozenDag] = useState<number | null>(vandaag.getDate())
  const [wedstrijden, setWedstrijden] = useState<Wedstrijd[]>([])
  const [trainingen, setTrainingen] = useState<Training[]>([])
  const [activiteiten, setActiviteiten] = useState<Activiteit[]>([])
  const [formOpen, setFormOpen] = useState<Activiteit | 'nieuw' | null>(null)
  const navigate = useNavigate()

  function laad() {
    api.wedstrijden.list().then(setWedstrijden)
    api.trainingen.list().then(setTrainingen)
    api.activiteiten.list().then(setActiviteiten)
  }
  useEffect(laad, [])

  function eventsOpDatum(dag: number): CalEvent[] {
    const dStr = datumSleutel(jaar, maand, dag)
    const res: CalEvent[] = []
    wedstrijden.forEach((w) => {
      if (w.datum.slice(0, 10) === dStr) {
        res.push({ type: 'wedstrijd', label: (w.thuis ? 'Thuis vs. ' : 'Uit bij ') + w.tegenstander, tijd: w.tijd, item: w })
      }
    })
    trainingen.forEach((t) => {
      if (t.datum.slice(0, 10) === dStr) {
        res.push({ type: 'training', label: t.locatie || 'Training', tijd: t.tijd, item: t })
      }
    })
    activiteiten.forEach((a) => {
      if (activiteitOpDatum(a, dStr)) {
        res.push({ type: 'activiteit', label: a.titel, tijd: a.heleDag ? null : a.tijd, item: a })
      }
    })
    return res.sort((x, y) => (x.tijd ?? '99') < (y.tijd ?? '99') ? -1 : 1)
  }

  function vorigeMaand() {
    if (maand === 0) {
      setMaand(11)
      setJaar((j) => j - 1)
    } else {
      setMaand((m) => m - 1)
    }
    setGekozenDag(null)
  }
  function volgendeMaand() {
    if (maand === 11) {
      setMaand(0)
      setJaar((j) => j + 1)
    } else {
      setMaand((m) => m + 1)
    }
    setGekozenDag(null)
  }

  const eersteVanMaand = new Date(jaar, maand, 1)
  let startDag = eersteVanMaand.getDay()
  startDag = startDag === 0 ? 6 : startDag - 1
  const dagenInMaand = new Date(jaar, maand + 1, 0).getDate()

  const cellen: { dag: number; huidig: boolean }[] = []
  for (let i = 0; i < startDag; i++) cellen.push({ dag: 0, huidig: false })
  for (let i = 1; i <= dagenInMaand; i++) cellen.push({ dag: i, huidig: true })
  while (cellen.length % 7 !== 0) cellen.push({ dag: 0, huidig: false })

  const isDezeMaand = maand === vandaag.getMonth() && jaar === vandaag.getFullYear()
  const gekozenEvents = gekozenDag ? eventsOpDatum(gekozenDag) : []

  return (
    <div>
      <div className="pagina-header">
        <div>
          <div className="eyebrow">Programma</div>
          <h2>Agenda</h2>
          <p>Wedstrijden, trainingen &amp; activiteiten</p>
        </div>
        <button className="knop-plus" onClick={() => setFormOpen('nieuw')}>
          +
        </button>
      </div>

      <div className="kaart" style={{ marginBottom: 16 }}>
        <div className="chip-rij" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
          <button className="knop lijn klein" onClick={vorigeMaand}>
            ‹
          </button>
          <strong>
            {MAANDEN[maand]} {jaar}
          </strong>
          <button className="knop lijn klein" onClick={volgendeMaand}>
            ›
          </button>
        </div>
        <div className="agenda-grid">
          {DAGEN.map((d) => (
            <div key={d} className="agenda-dag-naam">
              {d}
            </div>
          ))}
          {cellen.map((c, i) => {
            const events = c.huidig ? eventsOpDatum(c.dag) : []
            const isVandaag = c.huidig && c.dag === vandaag.getDate() && isDezeMaand
            const isGekozen = c.huidig && c.dag === gekozenDag
            return (
              <div
                key={i}
                className={'agenda-cel' + (c.huidig ? '' : ' leeg') + (isVandaag ? ' vandaag' : '') + (isGekozen ? ' gekozen' : '')}
                onClick={() => c.huidig && setGekozenDag(c.dag)}
              >
                {c.huidig && (
                  <>
                    <span>{c.dag}</span>
                    {events.length > 0 && <span className="agenda-stip-rij">{events.slice(0, 3).map((_, idx) => <span key={idx} className="agenda-stip" />)}</span>}
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {gekozenDag && (
        <div className="kaart">
          <div className="kaart-titel">
            {gekozenDag} {MAANDEN[maand]}
          </div>
          {gekozenEvents.length === 0 && <p className="form-hint">Niets gepland.</p>}
          {gekozenEvents.map((e, i) => {
            if (e.type === 'wedstrijd') {
              return (
                <div key={i} className="sp-rij" onClick={() => navigate(`/wedstrijden/${e.item.id}`)}>
                  <span className="sp-avatar">W</span>
                  <span className="sp-naam">
                    {e.tijd && <span className="sp-nr">{e.tijd}</span>}
                    {e.label}
                  </span>
                </div>
              )
            }
            if (e.type === 'training') {
              return (
                <div key={i} className="sp-rij" onClick={() => navigate(`/trainingen/${e.item.id}`)}>
                  <span className="sp-avatar">T</span>
                  <span className="sp-naam">
                    {e.tijd && <span className="sp-nr">{e.tijd}</span>}
                    {e.label}
                  </span>
                </div>
              )
            }
            const soort = activiteitSoort(e.item.soort)
            return (
              <div key={i} className="sp-rij" onClick={() => setFormOpen(e.item)}>
                <span className="sp-avatar" style={{ background: soort.kleur }}>
                  A
                </span>
                <span className="sp-naam">
                  {e.tijd && <span className="sp-nr">{e.tijd}</span>}
                  {e.label}
                  <span className="rap-datum"> — {soort.label}</span>
                </span>
              </div>
            )
          })}
        </div>
      )}

      {formOpen && (
        <ActiviteitForm
          activiteit={formOpen === 'nieuw' ? undefined : formOpen}
          standaardDatum={gekozenDag ? datumSleutel(jaar, maand, gekozenDag) : undefined}
          onClose={() => setFormOpen(null)}
          onSaved={() => {
            setFormOpen(null)
            laad()
          }}
        />
      )}
    </div>
  )
}
