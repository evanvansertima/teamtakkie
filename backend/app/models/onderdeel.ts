import { OnderdelenSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Training from '#models/training'
import Oefening from '#models/oefening'

export default class Onderdeel extends OnderdelenSchema {
  @belongsTo(() => Training)
  declare training: BelongsTo<typeof Training>

  @belongsTo(() => Oefening)
  declare oefening: BelongsTo<typeof Oefening>
}
