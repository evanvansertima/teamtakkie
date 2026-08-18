import { AanwezighedenSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Training from '#models/training'
import Speler from '#models/speler'

export default class Aanwezigheid extends AanwezighedenSchema {
  @belongsTo(() => Training)
  declare training: BelongsTo<typeof Training>

  @belongsTo(() => Speler)
  declare speler: BelongsTo<typeof Speler>
}
