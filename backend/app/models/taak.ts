import { TakenSchema } from '#database/schema'
import { hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import Taaktoewijzing from '#models/taaktoewijzing'

export default class Taak extends TakenSchema {
  @hasMany(() => Taaktoewijzing)
  declare toewijzingen: HasMany<typeof Taaktoewijzing>
}
