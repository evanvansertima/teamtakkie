// Ported from legacy/fc-harlingen-app.html's ACTIE_CATEGORIEEN — the live
// match event taxonomy. Zone-tapping (VELD_ZONES) and the 15-minute block
// breakdown dashboard are deliberately left out of this pass.

export type Actie = { type: string; label: string; team: 'fch' | 'teg'; speler?: boolean }
export type ActieCategorie = { id: string; label: string; kleur: string; acties: Actie[] }

export const ACTIE_CATEGORIEEN: ActieCategorie[] = [
  {
    id: 'aanval',
    label: 'Aanval',
    kleur: '#28a745',
    acties: [
      { type: 'goal', label: 'Doelpunt', team: 'fch', speler: true },
      { type: 'schot-doel', label: 'Schot op doel', team: 'fch', speler: true },
      { type: 'schot-naast', label: 'Schot naast', team: 'fch', speler: true },
      { type: 'assist', label: 'Assist', team: 'fch', speler: true },
      { type: 'corner-fch', label: 'Corner', team: 'fch' },
      { type: 'vrije-trap', label: 'Vrije trap', team: 'fch' },
      { type: 'straf-fch', label: 'Strafschop', team: 'fch' },
      { type: 'kans-gemist', label: 'Kans gemist', team: 'fch', speler: true },
    ],
  },
  {
    id: 'verdediging',
    label: 'Verdediging',
    kleur: '#17a2b8',
    acties: [
      { type: 'redding', label: 'Redding', team: 'fch', speler: true },
      { type: 'tackle', label: 'Tackle', team: 'fch', speler: true },
      { type: 'interceptie', label: 'Interceptie', team: 'fch', speler: true },
      { type: 'balverov', label: 'Balverovering', team: 'fch', speler: true },
      { type: 'kopbal', label: 'Kopbal gew.', team: 'fch', speler: true },
      { type: 'fout', label: 'Fout gemaakt', team: 'fch', speler: true },
    ],
  },
  {
    id: 'tegenpartij',
    label: 'Tegenstander',
    kleur: '#dc3545',
    acties: [
      { type: 'goal-teg', label: 'Tegengoal', team: 'teg' },
      { type: 'schot-doel-teg', label: 'Schot op doel', team: 'teg' },
      { type: 'schot-naast-teg', label: 'Schot naast', team: 'teg' },
      { type: 'corner-teg', label: 'Corner teg.', team: 'teg' },
      { type: 'vrije-trap-teg', label: 'Vrije trap', team: 'teg' },
      { type: 'straf-teg', label: 'Strafschop', team: 'teg' },
    ],
  },
  {
    id: 'discipline',
    label: 'Discipline',
    kleur: '#856404',
    acties: [
      { type: 'geel', label: 'Geel FCH', team: 'fch', speler: true },
      { type: 'rood', label: 'Rood FCH', team: 'fch', speler: true },
      { type: 'geel-teg', label: 'Geel Teg.', team: 'teg' },
      { type: 'rood-teg', label: 'Rood Teg.', team: 'teg' },
      { type: 'blessure', label: 'Blessure', team: 'fch', speler: true },
      { type: 'rust', label: 'Rust', team: 'fch' },
    ],
  },
]

const ALLE_ACTIES = ACTIE_CATEGORIEEN.flatMap((c) => c.acties)

export function actieInfo(type: string): Actie {
  return ALLE_ACTIES.find((a) => a.type === type) ?? { type, label: type, team: 'fch' }
}
