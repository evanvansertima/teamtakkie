import { RapportenSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Speler from '#models/speler'

export default class Rapport extends RapportenSchema {
  @belongsTo(() => Speler)
  declare speler: BelongsTo<typeof Speler>
}
