// Data shapes for the freehand tactics/training drawing board.
// Ported from legacy/fc-harlingen-app.html's TrainingTekenBord — element and
// line objects are intentionally loose (a union of every optional field any
// type uses) because that's how the canvas renderer and legacy data itself
// treats them.

export type ElemType =
  | 'speler'
  | 'speler-rood'
  | 'bal'
  | 'pion'
  | 'goal'
  | 'cirkel'
  | 'notitie'
  | 'zone-cirkel'
  | 'zone-vierkant'
  | 'zone-driehoek'
  | 'dummy'
  | 'ladder'
  | 'hordje'
  | 'stok'
  | 'hoedje'
  | 'minidoel'
  | 'ring'
  | 'mand'

export interface Elem {
  id: number
  type: ElemType
  x: number
  y: number
  schaal?: number
  hoek?: number
  nr?: number | string
  naam?: string
  kleur?: 'blauw' | 'rood' | 'grijs'
  b?: number
  h?: number
  tekst?: string
}

export type LijnType = 'looplijn' | 'passlijn' | 'schietlijn' | 'dribbellijn' | 'voorzetlijn'

export interface Lijn {
  id: number
  type: LijnType
  x1: number
  y1: number
  x2: number
  y2: number
  bocht?: 1 | -1
  nr?: number
  nrDonker?: boolean
}

export interface Frame {
  id: number
  elems: Elem[]
  lijnen: Lijn[]
}

export interface Tekening {
  elems: Elem[]
  lijnen: Lijn[]
  veldType: string
  stappen: Frame[]
}

export const LEGE_TEKENING: Tekening = {
  elems: [],
  lijnen: [],
  veldType: 'heel-h',
  stappen: [{ id: 1, elems: [], lijnen: [] }],
}
