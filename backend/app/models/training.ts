import { TrainingenSchema } from '#database/schema'
import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Seizoenblok from '#models/seizoenblok'
import Onderdeel from '#models/onderdeel'
import Aanwezigheid from '#models/aanwezigheid'

export default class Training extends TrainingenSchema {
  @belongsTo(() => Seizoenblok)
  declare seizoenblok: BelongsTo<typeof Seizoenblok>

  @hasMany(() => Onderdeel)
  declare onderdelen: HasMany<typeof Onderdeel>

  @hasMany(() => Aanwezigheid)
  declare aanwezigheden: HasMany<typeof Aanwezigheid>
}
