import { RittenSchema } from '#database/schema'
import { belongsTo, beforeSave, afterSave, afterFind, afterFetch } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Wedstrijd from '#models/wedstrijd'
import { serializeJsonColumns, parseJsonColumns } from '#models/json_columns'

const JSON_COLUMNS = ['passagiers']

export default class Rit extends RittenSchema {
  static table = 'ritten'

  @beforeSave()
  static serializeJson(rit: Rit) {
    serializeJsonColumns(rit, JSON_COLUMNS)
  }

  @afterSave()
  static restoreJson(rit: Rit) {
    parseJsonColumns(rit, JSON_COLUMNS)
  }

  @afterFind()
  static parseJson(rit: Rit) {
    parseJsonColumns(rit, JSON_COLUMNS)
  }

  @afterFetch()
  static parseJsonMany(ritten: Rit[]) {
    ritten.forEach((r) => parseJsonColumns(r, JSON_COLUMNS))
  }

  @belongsTo(() => Wedstrijd)
  declare wedstrijd: BelongsTo<typeof Wedstrijd>
}
