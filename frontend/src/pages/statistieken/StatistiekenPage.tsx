import { useEffect, useState } from 'react'
import { api, type Wedstrijd, type Training, type Speler, type Standrij } from '../../lib/api'
import { teamRecord, trainingOpkomst, spelerStats, eigenStandRij, standMetPunten } from '../../lib/stats'

type Tab = 'team' | 'individu' | 'stand'

export function StatistiekenPage() {
  const [tab, setTab] = useState<Tab>('team')
  const [wedstrijden, setWedstrijden] = useState<Wedstrijd[]>([])
  const [trainingen, setTrainingen] = useState<Training[]>([])
  const [spelers, setSpelers] = useState<Speler[]>([])
  const [standrijen, setStandrijen] = useState<Standrij[]>([])

  function laad() {
    api.wedstrijden.list().then(setWedstrijden)
    api.trainingen.list().then(setTrainingen)
    api.spelers.list().then(setSpelers)
    api.standrijen.list().then(setStandrijen)
  }
  useEffect(laad, [])

  return (
    <div>
      <div className="pagina-header">
        <div>
          <div className="eyebrow">Seizoensdata</div>
          <h2>Statistieken</h2>
        </div>
      </div>

      <div className="chip-rij" style={{ marginBottom: 16 }}>
        <button className={'chip' + (tab === 'team' ? ' actief' : '')} onClick={() => setTab('team')}>
          Team
        </button>
        <button className={'chip' + (tab === 'individu' ? ' actief' : '')} onClick={() => setTab('individu')}>
          Individu
        </button>
        <button className={'chip' + (tab === 'stand' ? ' actief' : '')} onClick={() => setTab('stand')}>
          Stand
        </button>
      </div>

      {tab === 'team' && <TeamTab wedstrijden={wedstrijden} trainingen={trainingen} />}
      {tab === 'individu' && <IndividuTab spelers={spelers} wedstrijden={wedstrijden} trainingen={trainingen} />}
      {tab === 'stand' && <StandTab wedstrijden={wedstrijden} standrijen={standrijen} onChanged={laad} />}
    </div>
  )
}

function TeamTab({ wedstrijden, trainingen }: { wedstrijden: Wedstrijd[]; trainingen: Training[] }) {
  const r = teamRecord(wedstrijden)
  const opkomst = trainingOpkomst(trainingen)

  return (
    <div className="kaart">
      <div className="kaart-titel">Resultaten</div>
      <div className="chip-rij" style={{ marginBottom: 16 }}>
        <StatMini label="Gewonnen" waarde={r.gewonnen} kleur="#28a745" />
        <StatMini label="Gelijk" waarde={r.gelijk} />
        <StatMini label="Verloren" waarde={r.verloren} kleur="#dc3545" />
        <StatMini label="Gespeeld" waarde={r.gespeeld} />
      </div>
      <div className="chip-rij" style={{ marginBottom: 16 }}>
        <StatMini label="Punten" waarde={r.punten} />
        <StatMini label="Punten / wedstrijd" waarde={r.puntenPerWedstrijd} />
        <StatMini label="Doelsaldo" waarde={(r.doelSaldo >= 0 ? '+' : '') + r.doelSaldo} kleur={r.doelSaldo >= 0 ? '#28a745' : '#dc3545'} />
      </div>
      <div className="chip-rij" style={{ marginBottom: 16 }}>
        <StatMini label="Doelp. voor" waarde={r.doelVoor} />
        <StatMini label="Doelp. tegen" waarde={r.doelTegen} />
        <StatMini label="Clean sheets" waarde={r.cleanSheets} />
        <StatMini label="Geel / Rood" waarde={`${r.geelKaarten} / ${r.roodKaarten}`} />
      </div>

      {r.vorm.length > 0 && (
        <>
          <div className="kaart-titel" style={{ marginTop: 8 }}>
            Vorm (laatste {r.vorm.length})
          </div>
          <div className="chip-rij">
            {r.vorm.map((u, i) => (
              <span
                key={i}
                className="ovr-badge"
                style={{
                  color: '#fff',
                  background: u === 'W' ? '#28a745' : u === 'G' ? '#6c757d' : '#dc3545',
                  borderRadius: '50%',
                  width: 26,
                  height: 26,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                }}
              >
                {u}
              </span>
            ))}
          </div>
        </>
      )}

      <div className="kaart-titel" style={{ marginTop: 16 }}>
        Trainingsopkomst
      </div>
      <p className="rap-tekst">{opkomst}% gemiddeld over {trainingen.length} training{trainingen.length !== 1 ? 'en' : ''}.</p>
    </div>
  )
}

function StatMini({ label, waarde, kleur }: { label: string; waarde: string | number; kleur?: string }) {
  return (
    <div style={{ textAlign: 'center', minWidth: 70 }}>
      <div style={{ fontSize: 20, fontWeight: 800, color: kleur }}>{waarde}</div>
      <div style={{ fontSize: 11, opacity: 0.65 }}>{label}</div>
    </div>
  )
}

function IndividuTab({ spelers, wedstrijden, trainingen }: { spelers: Speler[]; wedstrijden: Wedstrijd[]; trainingen: Training[] }) {
  const [gekozenId, setGekozenId] = useState<number | null>(spelers[0]?.id ?? null)

  useEffect(() => {
    if (!gekozenId && spelers.length > 0) setGekozenId(spelers[0].id)
  }, [spelers, gekozenId])

  if (spelers.length === 0) {
    return (
      <div className="leeg">
        <h3>Geen spelers</h3>
        <p>Voeg spelers toe bij Spelers om statistieken te bekijken.</p>
      </div>
    )
  }

  const sp = spelers.find((s) => s.id === gekozenId) ?? spelers[0]
  const st = spelerStats(sp.id, wedstrijden, trainingen)

  return (
    <div>
      <div className="kaart" style={{ marginBottom: 16 }}>
        <div className="kaart-titel">Kies speler</div>
        <select value={sp.id} onChange={(e) => setGekozenId(Number(e.target.value))}>
          {spelers.map((s) => (
            <option key={s.id} value={s.id}>
              {(s.rugnummer ? `#${s.rugnummer} ` : '') + s.naam}
            </option>
          ))}
        </select>
      </div>
      <div className="kaart">
        <div className="kaart-titel">{sp.naam}</div>
        <div className="chip-rij">
          <StatMini label="Wedstrijden" waarde={st.wedstrijden} />
          <StatMini label="Basisplaatsen" waarde={st.basisplaatsen} />
          <StatMini label="Minuten" waarde={st.minuten} />
          <StatMini label="Goals" waarde={st.goals} />
          <StatMini label="Assists" waarde={st.assists} />
        </div>
        <div className="chip-rij" style={{ marginTop: 10 }}>
          <StatMini label="Training" waarde={`${st.trainingPct}%`} />
          <StatMini label="Geel" waarde={st.geel} kleur="#eab308" />
          <StatMini label="Rood" waarde={st.rood} kleur="#dc3545" />
          <StatMini label="MOTM" waarde={st.motm} />
        </div>
      </div>
    </div>
  )
}

function StandTab({ wedstrijden, standrijen, onChanged }: { wedstrijden: Wedstrijd[]; standrijen: Standrij[]; onChanged: () => void }) {
  const [nieuwNaam, setNieuwNaam] = useState('')
  const eigen = eigenStandRij(wedstrijden, 'Ons team')
  const stand = standMetPunten([eigen, ...standrijen])

  async function voegToe() {
    if (!nieuwNaam.trim()) return
    await api.standrijen.create({ naam: nieuwNaam.trim() })
    setNieuwNaam('')
    onChanged()
  }

  async function verwijder(id: number) {
    await api.standrijen.remove(id)
    onChanged()
  }

  return (
    <div className="kaart">
      <div className="kaart-titel">Competitiestand</div>
      <div className="sp-lijst" style={{ marginBottom: 16 }}>
        {stand.map((r, i) => (
          <div key={r.id} className="sp-rij">
            <span className="sp-nr">{i + 1}</span>
            <span className="sp-naam">
              {r.naam === 'Ons team' ? <strong>{r.naam}</strong> : r.naam}
              <span className="rap-datum">
                {' '}
                {r.gespeeld}g · {r.winst}w · {r.gelijk}g · {r.verlies}v · saldo {r.saldo >= 0 ? '+' : ''}
                {r.saldo}
              </span>
            </span>
            <span className="ovr-badge">{r.punten}</span>
            {r.id !== -1 && (
              <button className="knop lijn klein" onClick={() => verwijder(r.id)}>
                ×
              </button>
            )}
          </div>
        ))}
      </div>
      <div className="chip-rij">
        <input value={nieuwNaam} onChange={(e) => setNieuwNaam(e.target.value)} placeholder="Naam tegenstander" style={{ flex: 1 }} />
        <button className="knop" onClick={voegToe}>
          + Team
        </button>
      </div>
    </div>
  )
}
