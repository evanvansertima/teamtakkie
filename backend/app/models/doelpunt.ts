import { DoelpuntenSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Speler from '#models/speler'
import Wedstrijd from '#models/wedstrijd'

export default class Doelpunt extends DoelpuntenSchema {
  @belongsTo(() => Wedstrijd)
  declare wedstrijd: BelongsTo<typeof Wedstrijd>

  @belongsTo(() => Speler, { foreignKey: 'scorerSpelerId' })
  declare scorerSpeler: BelongsTo<typeof Speler>

  @belongsTo(() => Speler, { foreignKey: 'assistSpelerId' })
  declare assistSpeler: BelongsTo<typeof Speler>
}
