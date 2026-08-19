import vine from '@vinejs/vine'

export const trainingValidator = vine.create({
  datum: vine.date(),
  tijd: vine.string().trim().optional(),
  locatie: vine.string().trim().optional(),
  duur: vine.number(),
  doelstellingen: vine.string().trim().optional(),
  voorbereidingen: vine.string().trim().optional(),
  materialen: vine.string().trim().optional(),
  notities: vine.string().trim().optional(),
})
