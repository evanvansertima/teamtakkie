import { WedstrijdenSchema } from '#database/schema'
import {
  belongsTo,
  hasMany,
  hasOne,
  beforeSave,
  afterSave,
  afterFind,
  afterFetch,
} from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany, HasOne } from '@adonisjs/lucid/types/relations'
import { serializeJsonColumns, parseJsonColumns } from '#models/json_columns'

const JSON_COLUMNS = ['score']
import Speler from '#models/speler'
import Opstellingrij from '#models/opstellingrij'
import Doelpunt from '#models/doelpunt'
import Kaart from '#models/kaart'
import Wissel from '#models/wissel'
import Opgave from '#models/opgave'
import Rit from '#models/rit'
import Roltoewijzing from '#models/roltoewijzing'
import Tactiekplan from '#models/tactiekplan'
import Speleropdracht from '#models/speleropdracht'
import Liveevent from '#models/liveevent'
import Review from '#models/review'
import Taaktoewijzing from '#models/taaktoewijzing'

export default class Wedstrijd extends WedstrijdenSchema {
  static table = 'wedstrijden'

  @beforeSave()
  static serializeJson(wedstrijd: Wedstrijd) {
    serializeJsonColumns(wedstrijd, JSON_COLUMNS)
  }

  @afterSave()
  static restoreJson(wedstrijd: Wedstrijd) {
    parseJsonColumns(wedstrijd, JSON_COLUMNS)
  }

  @afterFind()
  static parseJson(wedstrijd: Wedstrijd) {
    parseJsonColumns(wedstrijd, JSON_COLUMNS)
  }

  @afterFetch()
  static parseJsonMany(wedstrijden: Wedstrijd[]) {
    wedstrijden.forEach((w) => parseJsonColumns(w, JSON_COLUMNS))
  }

  @belongsTo(() => Speler, { foreignKey: 'motmSpelerId' })
  declare motmSpeler: BelongsTo<typeof Speler>

  @hasMany(() => Opstellingrij)
  declare opstellingrijen: HasMany<typeof Opstellingrij>

  @hasMany(() => Doelpunt)
  declare doelpunten: HasMany<typeof Doelpunt>

  @hasMany(() => Kaart)
  declare kaarten: HasMany<typeof Kaart>

  @hasMany(() => Wissel)
  declare wissels: HasMany<typeof Wissel>

  @hasMany(() => Opgave)
  declare opgaves: HasMany<typeof Opgave>

  @hasMany(() => Rit)
  declare ritten: HasMany<typeof Rit>

  @hasMany(() => Roltoewijzing)
  declare roltoewijzingen: HasMany<typeof Roltoewijzing>

  @hasOne(() => Tactiekplan)
  declare tactiekplan: HasOne<typeof Tactiekplan>

  @hasMany(() => Speleropdracht)
  declare speleropdrachten: HasMany<typeof Speleropdracht>

  @hasMany(() => Liveevent)
  declare liveevents: HasMany<typeof Liveevent>

  @hasMany(() => Review)
  declare reviews: HasMany<typeof Review>

  @hasMany(() => Taaktoewijzing)
  declare taaktoewijzingen: HasMany<typeof Taaktoewijzing>
}
