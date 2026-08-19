import vine from '@vinejs/vine'

export const tactiekplanValidator = vine.create({
  veldType: vine.string().trim().optional(),
  plan: vine.string().trim().optional(),
  balbezit: vine.string().trim().optional(),
  balverlies: vine.string().trim().optional(),
  omschakeling: vine.string().trim().optional(),
  tekening: vine.any().optional(),
  instructies: vine.any().optional(),
})
