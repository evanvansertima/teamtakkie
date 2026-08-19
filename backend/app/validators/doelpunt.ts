import vine from '@vinejs/vine'

export const doelpuntValidator = vine.create({
  scorerSpelerId: vine.number(),
  assistSpelerId: vine.number().optional(),
  minuut: vine.number().optional(),
})
