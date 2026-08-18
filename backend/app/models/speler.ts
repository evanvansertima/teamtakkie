import { SpelerSchema } from '#database/schema'
import { hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import Rapport from '#models/rapport'
import Doel from '#models/doel'
import Review from '#models/review'
import Opstellingrij from '#models/opstellingrij'
import Kaart from '#models/kaart'
import Aanwezigheid from '#models/aanwezigheid'

export default class Speler extends SpelerSchema {
  @hasMany(() => Rapport)
  declare rapporten: HasMany<typeof Rapport>

  @hasMany(() => Doel)
  declare doelen: HasMany<typeof Doel>

  @hasMany(() => Review)
  declare reviews: HasMany<typeof Review>

  @hasMany(() => Opstellingrij)
  declare opstellingrijen: HasMany<typeof Opstellingrij>

  @hasMany(() => Kaart)
  declare kaarten: HasMany<typeof Kaart>

  @hasMany(() => Aanwezigheid)
  declare aanwezigheden: HasMany<typeof Aanwezigheid>
}
