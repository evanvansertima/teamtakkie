import type { Wedstrijd, Training, Standrij } from './api'

// Ported from legacy/fc-harlingen-app.html's TeamStatistieken/StandTab —
// everything here is computed client-side from data the API already
// returns, matching how the legacy app derived stats from localStorage.

export function gespeeldeWedstrijden(wedstrijden: Wedstrijd[]) {
  return wedstrijden.filter((w) => w.status === 'gespeeld' && w.score)
}

export function teamRecord(wedstrijden: Wedstrijd[]) {
  const gespeeld = gespeeldeWedstrijden(wedstrijden)
  const gewonnen = gespeeld.filter((w) => (w.score!.fch ?? 0) > (w.score!.teg ?? 0)).length
  const gelijk = gespeeld.filter((w) => (w.score!.fch ?? 0) === (w.score!.teg ?? 0)).length
  const verloren = gespeeld.filter((w) => (w.score!.fch ?? 0) < (w.score!.teg ?? 0)).length
  const doelVoor = gespeeld.reduce((s, w) => s + (w.score!.fch ?? 0), 0)
  const doelTegen = gespeeld.reduce((s, w) => s + (w.score!.teg ?? 0), 0)
  const cleanSheets = gespeeld.filter((w) => (w.score!.teg ?? 0) === 0).length
  const geelKaarten = gespeeld.reduce((s, w) => s + (w.kaarten ?? []).filter((k) => k.type === 'geel').length, 0)
  const roodKaarten = gespeeld.reduce((s, w) => s + (w.kaarten ?? []).filter((k) => k.type === 'rood').length, 0)
  const punten = gewonnen * 3 + gelijk

  const chronologisch = [...gespeeld].sort((a, b) => new Date(a.datum).getTime() - new Date(b.datum).getTime())
  const vorm = chronologisch
    .slice(-8)
    .map((w): 'W' | 'G' | 'V' => ((w.score!.fch ?? 0) > (w.score!.teg ?? 0) ? 'W' : (w.score!.fch ?? 0) === (w.score!.teg ?? 0) ? 'G' : 'V'))

  return {
    gewonnen, gelijk, verloren, gespeeld: gespeeld.length,
    punten, doelVoor, doelTegen, doelSaldo: doelVoor - doelTegen,
    cleanSheets, geelKaarten, roodKaarten, vorm,
    puntenPerWedstrijd: gespeeld.length > 0 ? (punten / gespeeld.length).toFixed(1) : '–',
  }
}

export function trainingOpkomst(trainingen: Training[]) {
  const metAanwezigheid = trainingen.filter((t) => (t.aanwezigheden ?? []).length > 0)
  if (metAanwezigheid.length === 0) return 0
  const totRatio = metAanwezigheid.reduce((s, t) => {
    const aanw = (t.aanwezigheden ?? []).filter((a) => a.status === 'aanwezig').length
    const tot = (t.aanwezigheden ?? []).length
    return s + (tot > 0 ? aanw / tot : 0)
  }, 0)
  return Math.round((totRatio / metAanwezigheid.length) * 100)
}

export function spelerStats(spelerId: number, wedstrijden: Wedstrijd[], trainingen: Training[]) {
  const gespeeld = gespeeldeWedstrijden(wedstrijden)
  const goals = gespeeld.reduce((s, w) => s + (w.doelpunten ?? []).filter((d) => d.scorerSpelerId === spelerId).length, 0)
  const assists = gespeeld.reduce((s, w) => s + (w.doelpunten ?? []).filter((d) => d.assistSpelerId === spelerId).length, 0)
  const geel = gespeeld.reduce((s, w) => s + (w.kaarten ?? []).filter((k) => k.spelerId === spelerId && k.type === 'geel').length, 0)
  const rood = gespeeld.reduce((s, w) => s + (w.kaarten ?? []).filter((k) => k.spelerId === spelerId && k.type === 'rood').length, 0)
  const motm = gespeeld.filter((w) => w.motmSpelerId === spelerId).length

  const opstellingRijen = gespeeld.flatMap((w) => (w.opstellingrijen ?? []).filter((r) => r.spelerId === spelerId))
  const wedstrijden_gespeeld = opstellingRijen.filter((r) => r.spelStatus !== 'afwezig').length
  const basisplaatsen = opstellingRijen.filter((r) => r.spelStatus === 'basis').length
  const minuten = opstellingRijen.reduce((s, r) => s + (r.minuten ?? 0), 0)

  const metTraining = trainingen.filter((t) => (t.aanwezigheden ?? []).some((a) => a.spelerId === spelerId))
  const aanwezig = metTraining.filter((t) => (t.aanwezigheden ?? []).some((a) => a.spelerId === spelerId && a.status === 'aanwezig')).length
  const trainingPct = metTraining.length > 0 ? Math.round((aanwezig / metTraining.length) * 100) : 0

  return { goals, assists, geel, rood, motm, trainingPct, wedstrijden: wedstrijden_gespeeld, basisplaatsen, minuten }
}

export function eigenStandRij(wedstrijden: Wedstrijd[], teamNaam: string): Standrij {
  const gespeeld = gespeeldeWedstrijden(wedstrijden)
  return {
    id: -1,
    naam: teamNaam,
    gespeeld: gespeeld.length,
    winst: gespeeld.filter((w) => (w.score!.fch ?? 0) > (w.score!.teg ?? 0)).length,
    gelijk: gespeeld.filter((w) => (w.score!.fch ?? 0) === (w.score!.teg ?? 0)).length,
    verlies: gespeeld.filter((w) => (w.score!.fch ?? 0) < (w.score!.teg ?? 0)).length,
    doelVoor: gespeeld.reduce((s, w) => s + (w.score!.fch ?? 0), 0),
    doelTegen: gespeeld.reduce((s, w) => s + (w.score!.teg ?? 0), 0),
  }
}

export function standMetPunten(rijen: Standrij[]) {
  return rijen
    .map((r) => ({ ...r, punten: r.winst * 3 + r.gelijk, saldo: r.doelVoor - r.doelTegen }))
    .sort((a, b) => {
      if (b.punten !== a.punten) return b.punten - a.punten
      if (b.saldo !== a.saldo) return b.saldo - a.saldo
      return b.doelVoor - a.doelVoor
    })
}
