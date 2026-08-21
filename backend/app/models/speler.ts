import { SpelerSchema } from '#database/schema'
import { hasMany, beforeSave, afterSave, afterFind, afterFetch, beforeDelete } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import Rapport from '#models/rapport'
import Doel from '#models/doel'
import Review from '#models/review'
import Opstellingrij from '#models/opstellingrij'
import Kaart from '#models/kaart'
import Aanwezigheid from '#models/aanwezigheid'
import { serializeJsonColumns, parseJsonColumns } from '#models/json_columns'
import { verwijderSpelerFoto } from '#models/speler_foto'

const JSON_COLUMNS = ['skills', 'sterren', 'stats']

export default class Speler extends SpelerSchema {
  static table = 'spelers'

  @beforeSave()
  static serializeJson(speler: Speler) {
    serializeJsonColumns(speler, JSON_COLUMNS)
  }

  @afterSave()
  static restoreJson(speler: Speler) {
    parseJsonColumns(speler, JSON_COLUMNS)
  }

  @afterFind()
  static parseJson(speler: Speler) {
    parseJsonColumns(speler, JSON_COLUMNS)
  }

  @afterFetch()
  static parseJsonMany(spelers: Speler[]) {
    spelers.forEach((s) => parseJsonColumns(s, JSON_COLUMNS))
  }

  @beforeDelete()
  static async removeFoto(speler: Speler) {
    await verwijderSpelerFoto(speler.fotoPath)
  }

  @hasMany(() => Rapport)
  declare rapporten: HasMany<typeof Rapport>

  @hasMany(() => Doel)
  declare doelen: HasMany<typeof Doel>

  @hasMany(() => Review)
  declare reviews: HasMany<typeof Review>

  @hasMany(() => Opstellingrij)
  declare opstellingrijen: HasMany<typeof Opstellingrij>

  @hasMany(() => Kaart)
  declare kaarten: HasMany<typeof Kaart>

  @hasMany(() => Aanwezigheid)
  declare aanwezigheden: HasMany<typeof Aanwezigheid>
}
