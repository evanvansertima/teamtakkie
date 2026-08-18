import { FormatySchema } from '#database/schema'
import { beforeSave, afterSave, afterFind, afterFetch } from '@adonisjs/lucid/orm'
import { serializeJsonColumns, parseJsonColumns } from '#models/json_columns'

const JSON_COLUMNS = ['toewijzing']

export default class Formatie extends FormatySchema {
  static table = 'formaties'

  @beforeSave()
  static serializeJson(formatie: Formatie) {
    serializeJsonColumns(formatie, JSON_COLUMNS)
  }

  @afterSave()
  static restoreJson(formatie: Formatie) {
    parseJsonColumns(formatie, JSON_COLUMNS)
  }

  @afterFind()
  static parseJson(formatie: Formatie) {
    parseJsonColumns(formatie, JSON_COLUMNS)
  }

  @afterFetch()
  static parseJsonMany(formaties: Formatie[]) {
    formaties.forEach((f) => parseJsonColumns(f, JSON_COLUMNS))
  }
}
