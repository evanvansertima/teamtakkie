// Ported from legacy/fc-harlingen-app.html — the FC-style skill rating
// system (29 attributes, 1-99 scale, category averages, position-weighted
// overall rating). Kept as a straight port so scores computed here match
// what coaches are used to reading from the old app.

export type Positie = 'Keeper' | 'Verdediger' | 'Middenvelder' | 'Aanvaller'

export type FcAttribuut = { id: string; label: string }
export type FcCategorie = {
  id: string
  label: string
  kort: string
  kleur: string
  attrs: FcAttribuut[]
}

export type Speler = {
  positie?: string | null
  skills?: Record<string, number> | null
  sterren?: Record<string, number> | null
}

export const FC_CATEGORIEEN: FcCategorie[] = [
  {
    id: 'pace',
    label: 'Snelheid',
    kort: 'SNE',
    kleur: '#22c55e',
    attrs: [
      { id: 'acceleratie', label: 'Acceleratie' },
      { id: 'sprintsnelheid', label: 'Sprintsnelheid' },
    ],
  },
  {
    id: 'shooting',
    label: 'Schieten',
    kort: 'SCH',
    kleur: '#ef4444',
    attrs: [
      { id: 'positiespel', label: 'Positiespel' },
      { id: 'afwerken', label: 'Afwerken' },
      { id: 'schotkracht', label: 'Schotkracht' },
      { id: 'afstandsschot', label: 'Afstandsschot' },
      { id: 'volley', label: 'Volley' },
      { id: 'strafschop', label: 'Strafschop' },
    ],
  },
  {
    id: 'passing',
    label: 'Passen',
    kort: 'PAS',
    kleur: '#3b82f6',
    attrs: [
      { id: 'visie', label: 'Visie' },
      { id: 'voorzet', label: 'Voorzet' },
      { id: 'vrijetrap', label: 'Vrije trap' },
      { id: 'kortepass', label: 'Korte pass' },
      { id: 'langepass', label: 'Lange pass' },
      { id: 'effect', label: 'Effect' },
    ],
  },
  {
    id: 'dribbling',
    label: 'Dribbelen',
    kort: 'DRI',
    kleur: '#a855f7',
    attrs: [
      { id: 'wendbaarheid', label: 'Wendbaarheid' },
      { id: 'balans', label: 'Balans' },
      { id: 'reactie', label: 'Reactievermogen' },
      { id: 'balcontrole', label: 'Balcontrole' },
      { id: 'dribbelen', label: 'Dribbelen' },
      { id: 'kalmte', label: 'Kalmte' },
    ],
  },
  {
    id: 'defending',
    label: 'Verdedigen',
    kort: 'VER',
    kleur: '#f59e0b',
    attrs: [
      { id: 'onderscheppen', label: 'Onderscheppen' },
      { id: 'kopkracht', label: 'Kopkracht' },
      { id: 'verdedigend', label: 'Verdedigend inzicht' },
      { id: 'staandetackle', label: 'Staande tackle' },
      { id: 'slidingtackle', label: 'Sliding' },
    ],
  },
  {
    id: 'physical',
    label: 'Fysiek',
    kort: 'FYS',
    kleur: '#06b6d4',
    attrs: [
      { id: 'sprongkracht', label: 'Sprongkracht' },
      { id: 'uithouding', label: 'Uithoudingsvermogen' },
      { id: 'kracht', label: 'Kracht' },
      { id: 'agressie', label: 'Agressie' },
    ],
  },
]

export const FC_KEEPER: FcCategorie[] = [
  {
    id: 'keeping',
    label: 'Keepen',
    kort: 'KEE',
    kleur: '#eab308',
    attrs: [
      { id: 'gk_duiken', label: 'Duiken' },
      { id: 'gk_vangen', label: 'Vangen' },
      { id: 'gk_uittrappen', label: 'Uittrappen' },
      { id: 'gk_reflexen', label: 'Reflexen' },
      { id: 'gk_snelheid', label: 'Snelheid' },
      { id: 'gk_positiespel', label: 'Positiespel' },
    ],
  },
  {
    id: 'physical',
    label: 'Fysiek',
    kort: 'FYS',
    kleur: '#06b6d4',
    attrs: [
      { id: 'sprongkracht', label: 'Sprongkracht' },
      { id: 'kracht', label: 'Kracht' },
      { id: 'kalmte', label: 'Kalmte' },
      { id: 'langepass', label: 'Lange pass' },
    ],
  },
]

export function fcCategorieen(speler: Speler | null | undefined): FcCategorie[] {
  return speler?.positie === 'Keeper' ? FC_KEEPER : FC_CATEGORIEEN
}

export const FC_STERREN = [
  { id: 'trucs', label: 'Trucjes', uitleg: 'Hoeveel technische trucs beheerst hij?' },
  { id: 'zwakbeen', label: 'Andere been', uitleg: 'Hoe goed is hij met zijn niet-favoriete been?' },
]

export function fcWaarde(speler: Speler | null | undefined, id: string): number | null {
  const v = Number(speler?.skills?.[id])
  return Number.isNaN(v) ? null : Math.max(1, Math.min(99, Math.round(v)))
}

export function fcCategorieWaarde(speler: Speler | null | undefined, cat: FcCategorie): number | null {
  const w = cat.attrs.map((a) => fcWaarde(speler, a.id)).filter((x): x is number => x !== null)
  if (!w.length) return null
  return Math.round(w.reduce((a, b) => a + b, 0) / w.length)
}

export function fcSterren(speler: Speler | null | undefined, id: string): number | null {
  const v = Number(speler?.sterren?.[id])
  return Number.isNaN(v) ? null : Math.max(1, Math.min(5, Math.round(v)))
}

const FC_ALLE_ATTRS: Record<string, FcAttribuut> = (() => {
  const out: Record<string, FcAttribuut> = {}
  ;[...FC_CATEGORIEEN, ...FC_KEEPER].forEach((c) => c.attrs.forEach((a) => (out[a.id] = a)))
  return out
})()

export function heeftSkills(speler: Speler | null | undefined): boolean {
  return Object.keys(FC_ALLE_ATTRS).some((id) => fcWaarde(speler, id) !== null)
}

const OVR_GEWICHT: Record<string, Record<string, number>> = {
  Keeper: { keeping: 0.82, physical: 0.18 },
  Verdediger: { defending: 0.4, physical: 0.2, pace: 0.14, passing: 0.12, dribbling: 0.11, shooting: 0.03 },
  Middenvelder: { passing: 0.3, dribbling: 0.24, defending: 0.15, physical: 0.12, shooting: 0.13, pace: 0.06 },
  Aanvaller: { shooting: 0.33, dribbling: 0.24, pace: 0.18, passing: 0.12, physical: 0.1, defending: 0.03 },
}
const DEFAULT_GEWICHT = { passing: 0.2, dribbling: 0.2, defending: 0.16, physical: 0.16, shooting: 0.16, pace: 0.12 }

function ovrGewicht(positie: string | null | undefined) {
  return (positie && OVR_GEWICHT[positie]) || DEFAULT_GEWICHT
}

export function fcOvr(speler: Speler | null | undefined): number | null {
  const gew = ovrGewicht(speler?.positie)
  let som = 0
  let gewicht = 0
  fcCategorieen(speler).forEach((c) => {
    const w = fcCategorieWaarde(speler, c)
    if (w === null) return
    const g = (gew as Record<string, number>)[c.id] ?? 0.1
    som += w * g
    gewicht += g
  })
  if (!gewicht) return null
  return Math.round(som / gewicht)
}

export function ovrKleur(v: number | null | undefined): string {
  const n = Number(v) || 0
  if (n >= 75) return '#22c55e'
  if (n >= 65) return '#84cc16'
  if (n >= 55) return '#eab308'
  if (n >= 45) return '#f59e0b'
  return '#ef4444'
}

export const RAPPORT_SOORTEN = [
  { id: 'begin', label: 'Beginrapport', kort: 'Begin', kleur: '#3b82f6', uitleg: 'Waar staat hij aan het begin van het seizoen?' },
  { id: 'tussen', label: 'Tussenrapport', kort: 'Tussen', kleur: '#f59e0b', uitleg: 'Halverwege: wat gaat goed, waar werken we aan?' },
  { id: 'eind', label: 'Eindrapport', kort: 'Eind', kleur: '#22c55e', uitleg: 'Terugblik op het hele seizoen en de stap naar volgend jaar.' },
] as const

export function rapportSoort(id: string) {
  return RAPPORT_SOORTEN.find((r) => r.id === id) ?? RAPPORT_SOORTEN[0]
}

export type Rapport = {
  id: number
  seizoen: string
  soort: string
  positie?: string | null
  skills?: Record<string, number> | null
  sterren?: Record<string, number> | null
  ovr?: number | null
}

export function rapportVerschil(van: Rapport | null, tot: Rapport | null) {
  if (!van || !tot) return []
  const a: Speler = { positie: van.positie as Positie, skills: van.skills, sterren: van.sterren }
  const b: Speler = { positie: tot.positie as Positie, skills: tot.skills, sterren: tot.sterren }
  return fcCategorieen(b).map((cat) => {
    const va = fcCategorieWaarde(a, cat)
    const vb = fcCategorieWaarde(b, cat)
    return { cat, van: va, tot: vb, groei: va !== null && vb !== null ? vb - va : null }
  })
}

export const BESCHIKBAARHEID = [
  { id: 'fit', label: 'Beschikbaar', kleur: '#28a745' },
  { id: 'twijfel', label: 'Twijfel', kleur: '#fd7e14' },
  { id: 'geblesseerd', label: 'Blessure', kleur: '#dc3545' },
  { id: 'geschorst', label: 'Geschorst', kleur: '#6c757d' },
  { id: 'vakantie', label: 'Vakantie', kleur: '#0ea5e9' },
] as const

export function beschikbaarheidInfo(id: string | null | undefined) {
  return BESCHIKBAARHEID.find((b) => b.id === id) ?? BESCHIKBAARHEID[0]
}

export const ROL_VOLGORDE: Positie[] = ['Keeper', 'Verdediger', 'Middenvelder', 'Aanvaller']

export const BENEN = [
  { id: 'Rechts', label: 'Rechts' },
  { id: 'Links', label: 'Links' },
  { id: 'Beide', label: 'Beide' },
] as const
