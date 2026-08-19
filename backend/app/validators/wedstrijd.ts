import vine from '@vinejs/vine'

export const wedstrijdValidator = vine.create({
  tegenstander: vine.string().trim().minLength(1),
  datum: vine.date(),
  tijd: vine.string().trim().optional(),
  locatie: vine.string().trim().optional(),
  thuis: vine.boolean(),
  status: vine.enum(['gepland', 'gespeeld']).optional(),
  score: vine
    .object({
      fch: vine.number().optional(),
      teg: vine.number().optional(),
    })
    .optional(),
  motmSpelerId: vine.number().optional(),
  formatie: vine.string().trim().optional(),
  speelduur: vine.number().optional(),
  notities: vine.string().trim().optional(),
})
