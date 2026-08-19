import vine from '@vinejs/vine'

export const onderdeelValidator = vine.create({
  naam: vine.string().trim().minLength(1),
  type: vine
    .enum(['Warming-up', 'Oefening', 'Positiespel', 'Wedstrijdvorm', 'Conditie', 'Afkoelen'])
    .optional(),
  doel: vine.string().trim().optional(),
  duur: vine.number().optional(),
  aantalSpelers: vine.number().optional(),
  veldGrootte: vine.string().trim().optional(),
  materialen: vine.string().trim().optional(),
  beschrijving: vine.string().trim().optional(),
  aandachtspunten: vine.string().trim().optional(),
  tekening: vine.any().optional(),
})
