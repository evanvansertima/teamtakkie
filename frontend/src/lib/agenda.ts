import type { Activiteit } from './api'

export const ACTIVITEIT_SOORTEN = [
  { id: 'overig', label: 'Algemeen', kleur: '#004aad' },
  { id: 'teamuitje', label: 'Teamuitje', kleur: '#8b5cf6' },
  { id: 'toernooi', label: 'Toernooi', kleur: '#f59e0b' },
  { id: 'overleg', label: 'Overleg', kleur: '#0891b2' },
  { id: 'klus', label: 'Klus / dienst', kleur: '#65a30d' },
  { id: 'verjaardag', label: 'Verjaardag', kleur: '#db2777' },
  { id: 'vrij', label: 'Geen training', kleur: '#6c757d' },
] as const

export function activiteitSoort(id: string | null) {
  return ACTIVITEIT_SOORTEN.find((s) => s.id === id) ?? ACTIVITEIT_SOORTEN[0]
}

// Ported from legacy/fc-harlingen-app.html's activiteitOpDatum — decides
// whether a (possibly recurring) activity falls on a given date.
export function activiteitOpDatum(a: Activiteit, datumStr: string): boolean {
  if (!a.datum) return false
  if (a.datum.slice(0, 10) === datumStr) return true
  if (!a.herhaal || a.herhaal === 'nee') return false

  const start = new Date(a.datum)
  const doel = new Date(datumStr)
  if (Number.isNaN(start.getTime()) || Number.isNaN(doel.getTime()) || doel <= start) return false

  if (a.herhaalTot) {
    const tot = new Date(a.herhaalTot)
    if (!Number.isNaN(tot.getTime()) && doel > tot) return false
  }

  if (a.herhaal === 'wekelijks') return doel.getDay() === start.getDay()
  if (a.herhaal === 'tweewekelijks') {
    if (doel.getDay() !== start.getDay()) return false
    return Math.round((doel.getTime() - start.getTime()) / 604800000) % 2 === 0
  }
  if (a.herhaal === 'maandelijks') return doel.getDate() === start.getDate()
  return false
}
