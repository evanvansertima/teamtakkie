import { ToernooiteamSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Toernooi from '#models/toernooi'

export default class Toernooiteam extends ToernooiteamSchema {
  static table = 'toernooiteams'

  @belongsTo(() => Toernooi)
  declare toernooi: BelongsTo<typeof Toernooi>
}
