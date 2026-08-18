import { ReviewSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Speler from '#models/speler'
import Wedstrijd from '#models/wedstrijd'

export default class Review extends ReviewSchema {
  @belongsTo(() => Speler)
  declare speler: BelongsTo<typeof Speler>

  @belongsTo(() => Wedstrijd)
  declare wedstrijd: BelongsTo<typeof Wedstrijd>
}
