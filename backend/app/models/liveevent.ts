import { LiveeventSchema } from '#database/schema'
import { belongsTo, beforeSave, afterSave, afterFind, afterFetch } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Speler from '#models/speler'
import Wedstrijd from '#models/wedstrijd'
import { serializeJsonColumns, parseJsonColumns } from '#models/json_columns'

const JSON_COLUMNS = ['details']

export default class Liveevent extends LiveeventSchema {
  static table = 'liveevents'

  @beforeSave()
  static serializeJson(event: Liveevent) {
    serializeJsonColumns(event, JSON_COLUMNS)
  }

  @afterSave()
  static restoreJson(event: Liveevent) {
    parseJsonColumns(event, JSON_COLUMNS)
  }

  @afterFind()
  static parseJson(event: Liveevent) {
    parseJsonColumns(event, JSON_COLUMNS)
  }

  @afterFetch()
  static parseJsonMany(events: Liveevent[]) {
    events.forEach((e) => parseJsonColumns(e, JSON_COLUMNS))
  }

  @belongsTo(() => Wedstrijd)
  declare wedstrijd: BelongsTo<typeof Wedstrijd>

  @belongsTo(() => Speler)
  declare speler: BelongsTo<typeof Speler>
}
