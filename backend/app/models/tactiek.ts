import { TactiekenSchema } from '#database/schema'
import { beforeSave, afterSave, afterFind, afterFetch } from '@adonisjs/lucid/orm'
import { serializeJsonColumns, parseJsonColumns } from '#models/json_columns'

const JSON_COLUMNS = ['tekening']

export default class Tactiek extends TactiekenSchema {
  static table = 'tactieken'

  @beforeSave()
  static serializeJson(tactiek: Tactiek) {
    serializeJsonColumns(tactiek, JSON_COLUMNS)
  }

  @afterSave()
  static restoreJson(tactiek: Tactiek) {
    parseJsonColumns(tactiek, JSON_COLUMNS)
  }

  @afterFind()
  static parseJson(tactiek: Tactiek) {
    parseJsonColumns(tactiek, JSON_COLUMNS)
  }

  @afterFetch()
  static parseJsonMany(tactieken: Tactiek[]) {
    tactieken.forEach((t) => parseJsonColumns(t, JSON_COLUMNS))
  }
}
