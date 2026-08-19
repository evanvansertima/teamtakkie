import vine from '@vinejs/vine'

export const formatieValidator = vine.create({
  naam: vine.string().trim().minLength(1),
  formatie: vine.string().trim().minLength(1),
  toewijzing: vine.record(vine.number()).optional(),
})
