import vine from '@vinejs/vine'

export const aanwezigheidValidator = vine.create({
  status: vine.enum(['aanwezig', 'afwezig', 'geblesseerd']),
})
