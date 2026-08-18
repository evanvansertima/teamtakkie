import { OefeningenSchema } from '#database/schema'
import { hasMany, beforeSave, afterSave, afterFind, afterFetch } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import Onderdeel from '#models/onderdeel'
import { serializeJsonColumns, parseJsonColumns } from '#models/json_columns'

const JSON_COLUMNS = ['tekening']

export default class Oefening extends OefeningenSchema {
  static table = 'oefeningen'

  @beforeSave()
  static serializeJson(oefening: Oefening) {
    serializeJsonColumns(oefening, JSON_COLUMNS)
  }

  @afterSave()
  static restoreJson(oefening: Oefening) {
    parseJsonColumns(oefening, JSON_COLUMNS)
  }

  @afterFind()
  static parseJson(oefening: Oefening) {
    parseJsonColumns(oefening, JSON_COLUMNS)
  }

  @afterFetch()
  static parseJsonMany(oefeningen: Oefening[]) {
    oefeningen.forEach((o) => parseJsonColumns(o, JSON_COLUMNS))
  }

  @hasMany(() => Onderdeel)
  declare onderdelen: HasMany<typeof Onderdeel>
}
