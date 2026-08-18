import { OpstellingrijenSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Speler from '#models/speler'
import Wedstrijd from '#models/wedstrijd'

export default class Opstellingrij extends OpstellingrijenSchema {
  static table = 'opstellingrijen'

  @belongsTo(() => Speler)
  declare speler: BelongsTo<typeof Speler>

  @belongsTo(() => Wedstrijd)
  declare wedstrijd: BelongsTo<typeof Wedstrijd>
}
