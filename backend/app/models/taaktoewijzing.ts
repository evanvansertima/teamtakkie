import { TaaktoewijzingenSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Taak from '#models/taak'
import Wedstrijd from '#models/wedstrijd'
import Speler from '#models/speler'

export default class Taaktoewijzing extends TaaktoewijzingenSchema {
  static table = 'taaktoewijzingen'

  @belongsTo(() => Taak)
  declare taak: BelongsTo<typeof Taak>

  @belongsTo(() => Wedstrijd)
  declare wedstrijd: BelongsTo<typeof Wedstrijd>

  @belongsTo(() => Speler)
  declare speler: BelongsTo<typeof Speler>
}
