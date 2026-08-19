import { ActiviteitenSchema } from '#database/schema'
import { afterFind, afterFetch } from '@adonisjs/lucid/orm'
import { parseBooleanColumns } from '#models/json_columns'

const BOOLEAN_COLUMNS = ['heleDag']

export default class Activiteit extends ActiviteitenSchema {
  static table = 'activiteiten'

  @afterFind()
  static parseBooleans(activiteit: Activiteit) {
    parseBooleanColumns(activiteit, BOOLEAN_COLUMNS)
  }

  @afterFetch()
  static parseBooleansMany(activiteiten: Activiteit[]) {
    activiteiten.forEach((a) => parseBooleanColumns(a, BOOLEAN_COLUMNS))
  }
}
