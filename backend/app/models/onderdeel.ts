import { OnderdelenSchema } from '#database/schema'
import { belongsTo, beforeSave, afterSave, afterFind, afterFetch } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Training from '#models/training'
import Oefening from '#models/oefening'
import { serializeJsonColumns, parseJsonColumns } from '#models/json_columns'

const JSON_COLUMNS = ['tekening']

export default class Onderdeel extends OnderdelenSchema {
  static table = 'onderdelen'

  @beforeSave()
  static serializeJson(onderdeel: Onderdeel) {
    serializeJsonColumns(onderdeel, JSON_COLUMNS)
  }

  @afterSave()
  static restoreJson(onderdeel: Onderdeel) {
    parseJsonColumns(onderdeel, JSON_COLUMNS)
  }

  @afterFind()
  static parseJson(onderdeel: Onderdeel) {
    parseJsonColumns(onderdeel, JSON_COLUMNS)
  }

  @afterFetch()
  static parseJsonMany(onderdelen: Onderdeel[]) {
    onderdelen.forEach((o) => parseJsonColumns(o, JSON_COLUMNS))
  }

  @belongsTo(() => Training)
  declare training: BelongsTo<typeof Training>

  @belongsTo(() => Oefening)
  declare oefening: BelongsTo<typeof Oefening>
}
