import { WisselSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Speler from '#models/speler'
import Wedstrijd from '#models/wedstrijd'

export default class Wissel extends WisselSchema {
  @belongsTo(() => Wedstrijd)
  declare wedstrijd: BelongsTo<typeof Wedstrijd>

  @belongsTo(() => Speler, { foreignKey: 'uitSpelerId' })
  declare uitSpeler: BelongsTo<typeof Speler>

  @belongsTo(() => Speler, { foreignKey: 'inSpelerId' })
  declare inSpeler: BelongsTo<typeof Speler>
}
