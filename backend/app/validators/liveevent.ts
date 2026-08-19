import vine from '@vinejs/vine'

export const liveeventValidator = vine.create({
  type: vine.string().trim().minLength(1),
  minuut: vine.number().optional(),
  spelerId: vine.number().optional(),
})
