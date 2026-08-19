import vine from '@vinejs/vine'

export const standrijValidator = vine.create({
  naam: vine.string().trim().minLength(1),
  gespeeld: vine.number().optional(),
  winst: vine.number().optional(),
  gelijk: vine.number().optional(),
  verlies: vine.number().optional(),
  doelVoor: vine.number().optional(),
  doelTegen: vine.number().optional(),
})
