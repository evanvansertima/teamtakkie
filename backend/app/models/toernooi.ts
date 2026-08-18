import { ToernooienSchema } from '#database/schema'
import { hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import Toernooiteam from '#models/toernooiteam'
import Toernooiwedstrijd from '#models/toernooiwedstrijd'

export default class Toernooi extends ToernooienSchema {
  @hasMany(() => Toernooiteam)
  declare teams: HasMany<typeof Toernooiteam>

  @hasMany(() => Toernooiwedstrijd)
  declare wedstrijden: HasMany<typeof Toernooiwedstrijd>
}
