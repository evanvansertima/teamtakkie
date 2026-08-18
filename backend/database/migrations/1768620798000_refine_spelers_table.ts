import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'spelers'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.date('geboortedatum').nullable()
      table.string('telefoon').nullable()
      table.string('email').nullable()
      table.string('adres').nullable()
      table.string('land').nullable().defaultTo('Nederland')
      table.string('beschikbaar_notitie').nullable()
    })

    // positie starts empty until a coach sets it; beschikbaar defaults to "fit"
    // per the legacy app (LEEG_SPELER), not "beschikbaar" as originally migrated.
    this.schema.raw(`
      UPDATE spelers SET beschikbaar = 'fit' WHERE beschikbaar = 'beschikbaar'
    `)
    this.schema.alterTable(this.tableName, (table) => {
      table.string('positie').nullable().alter()
      table.string('beschikbaar').notNullable().defaultTo('fit').alter()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('geboortedatum')
      table.dropColumn('telefoon')
      table.dropColumn('email')
      table.dropColumn('adres')
      table.dropColumn('land')
      table.dropColumn('beschikbaar_notitie')
    })
  }
}
