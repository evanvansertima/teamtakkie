import { RapportenSchema } from '#database/schema'
import { belongsTo, beforeSave, afterSave, afterFind, afterFetch } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Speler from '#models/speler'
import { serializeJsonColumns, parseJsonColumns } from '#models/json_columns'

const JSON_COLUMNS = ['skills', 'sterren']

export default class Rapport extends RapportenSchema {
  static table = 'rapporten'

  @beforeSave()
  static serializeJson(rapport: Rapport) {
    serializeJsonColumns(rapport, JSON_COLUMNS)
  }

  @afterSave()
  static restoreJson(rapport: Rapport) {
    parseJsonColumns(rapport, JSON_COLUMNS)
  }

  @afterFind()
  static parseJson(rapport: Rapport) {
    parseJsonColumns(rapport, JSON_COLUMNS)
  }

  @afterFetch()
  static parseJsonMany(rapporten: Rapport[]) {
    rapporten.forEach((r) => parseJsonColumns(r, JSON_COLUMNS))
  }

  @belongsTo(() => Speler)
  declare speler: BelongsTo<typeof Speler>
}
