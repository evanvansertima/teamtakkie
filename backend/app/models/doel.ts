import { DoelenSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Speler from '#models/speler'

export default class Doel extends DoelenSchema {
  @belongsTo(() => Speler)
  declare speler: BelongsTo<typeof Speler>
}
