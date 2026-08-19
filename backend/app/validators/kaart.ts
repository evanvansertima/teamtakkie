import vine from '@vinejs/vine'

export const kaartValidator = vine.create({
  spelerId: vine.number(),
  type: vine.enum(['geel', 'rood']),
  minuut: vine.number().optional(),
})
