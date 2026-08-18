import vine from '@vinejs/vine'

const skillsSchema = vine.record(vine.number().range([1, 99])).optional()
const sterrenSchema = vine.record(vine.number().range([1, 5])).optional()

export const spelerValidator = vine.create({
  naam: vine.string().trim().minLength(1),
  rugnummer: vine.string().trim().optional(),
  positie: vine.enum(['Keeper', 'Verdediger', 'Middenvelder', 'Aanvaller']).optional(),
  positie2: vine.enum(['Keeper', 'Verdediger', 'Middenvelder', 'Aanvaller']).optional(),
  geboortedatum: vine.date().optional(),
  favorietBeen: vine.enum(['Rechts', 'Links', 'Beide']).optional(),
  telefoon: vine.string().trim().optional(),
  email: vine.string().trim().email().optional(),
  adres: vine.string().trim().optional(),
  land: vine.string().trim().optional(),
  beschikbaar: vine
    .enum(['fit', 'twijfel', 'geblesseerd', 'geschorst', 'vakantie'])
    .optional(),
  beschikbaarNotitie: vine.string().trim().optional(),
  skills: skillsSchema,
  sterren: sterrenSchema,
  stats: vine
    .object({
      doelpunten: vine.number().optional(),
      assists: vine.number().optional(),
      geelKaarten: vine.number().optional(),
      roodKaarten: vine.number().optional(),
      speelMinuten: vine.number().optional(),
      wedstrijden: vine.number().optional(),
    })
    .optional(),
})
