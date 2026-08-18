import { SeizoenblokkenSchema } from '#database/schema'
import { hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import Training from '#models/training'

export default class Seizoenblok extends SeizoenblokkenSchema {
  @hasMany(() => Training)
  declare trainingen: HasMany<typeof Training>
}
