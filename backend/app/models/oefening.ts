import { OefeningenSchema } from '#database/schema'
import { hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import Onderdeel from '#models/onderdeel'

export default class Oefening extends OefeningenSchema {
  @hasMany(() => Onderdeel)
  declare onderdelen: HasMany<typeof Onderdeel>
}
