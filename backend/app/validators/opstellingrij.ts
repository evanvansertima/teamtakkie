import vine from '@vinejs/vine'

export const opstellingrijValidator = vine.create({
  spelerId: vine.number(),
  positieId: vine.string().trim().minLength(1),
  positieLabel: vine.string().trim().minLength(1),
  spelStatus: vine.enum(['basis', 'wissel', 'afwezig']).optional(),
  minuten: vine.number().optional(),
})

export const opstellingrijUpdateValidator = vine.create({
  spelStatus: vine.enum(['basis', 'wissel', 'afwezig']).optional(),
  minuten: vine.number().optional(),
})
