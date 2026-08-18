import vine from '@vinejs/vine'

const skillsSchema = vine.record(vine.number().range([1, 99])).optional()
const sterrenSchema = vine.record(vine.number().range([1, 5])).optional()

/**
 * The FC-style scoring (skills, sterren, ovr) is computed client-side from
 * the player's current values at the moment a report is filed, then sent
 * as a snapshot — a report is a point-in-time record, not a live query.
 */
export const rapportValidator = vine.create({
  seizoen: vine.string().trim().minLength(1),
  soort: vine.enum(['begin', 'tussen', 'eind']),
  tekst: vine.string().trim().optional(),
  positie: vine.string().trim().optional(),
  skills: skillsSchema,
  sterren: sterrenSchema,
  ovr: vine.number().range([1, 99]).optional(),
})
