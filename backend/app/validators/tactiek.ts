import vine from '@vinejs/vine'

export const tactiekValidator = vine.create({
  naam: vine.string().trim().minLength(1),
  veldType: vine.string().trim().optional(),
  tekening: vine.any().optional(),
})
