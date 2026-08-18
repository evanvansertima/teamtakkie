import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'instellingen'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.string('club_naam').notNullable()
      table.string('team_naam').notNullable()
      table.string('seizoen').notNullable()
      table.string('thema').nullable()
      table.string('accent').nullable()
      table.string('logo_path').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
