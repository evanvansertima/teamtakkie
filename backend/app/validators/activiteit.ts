import vine from '@vinejs/vine'

export const activiteitValidator = vine.create({
  titel: vine.string().trim().minLength(1),
  soort: vine
    .enum(['overig', 'teamuitje', 'toernooi', 'overleg', 'klus', 'verjaardag', 'vrij'])
    .optional(),
  datum: vine.date(),
  locatie: vine.string().trim().optional(),
  heleDag: vine.boolean().optional(),
  tijd: vine.string().trim().optional(),
  eindtijd: vine.string().trim().optional(),
  herhaal: vine.enum(['nee', 'wekelijks', 'tweewekelijks', 'maandelijks']).optional(),
  herhaalTot: vine.date().optional(),
  notitie: vine.string().trim().optional(),
})
