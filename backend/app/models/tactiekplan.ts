import { TactiekplannenSchema } from '#database/schema'
import { belongsTo, beforeSave, afterSave, afterFind, afterFetch } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Wedstrijd from '#models/wedstrijd'
import { serializeJsonColumns, parseJsonColumns } from '#models/json_columns'

const JSON_COLUMNS = ['tekening']

export default class Tactiekplan extends TactiekplannenSchema {
  static table = 'tactiekplannen'

  @beforeSave()
  static serializeJson(tactiekplan: Tactiekplan) {
    serializeJsonColumns(tactiekplan, JSON_COLUMNS)
  }

  @afterSave()
  static restoreJson(tactiekplan: Tactiekplan) {
    parseJsonColumns(tactiekplan, JSON_COLUMNS)
  }

  @afterFind()
  static parseJson(tactiekplan: Tactiekplan) {
    parseJsonColumns(tactiekplan, JSON_COLUMNS)
  }

  @afterFetch()
  static parseJsonMany(tactiekplannen: Tactiekplan[]) {
    tactiekplannen.forEach((t) => parseJsonColumns(t, JSON_COLUMNS))
  }

  @belongsTo(() => Wedstrijd)
  declare wedstrijd: BelongsTo<typeof Wedstrijd>
}
