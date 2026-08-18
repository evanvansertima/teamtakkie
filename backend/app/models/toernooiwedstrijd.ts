import { ToernooiwedstrijdenSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Toernooi from '#models/toernooi'
import Toernooiteam from '#models/toernooiteam'

export default class Toernooiwedstrijd extends ToernooiwedstrijdenSchema {
  @belongsTo(() => Toernooi)
  declare toernooi: BelongsTo<typeof Toernooi>

  @belongsTo(() => Toernooiteam, { foreignKey: 'thuisTeamId' })
  declare thuisTeam: BelongsTo<typeof Toernooiteam>

  @belongsTo(() => Toernooiteam, { foreignKey: 'uitTeamId' })
  declare uitTeam: BelongsTo<typeof Toernooiteam>
}
