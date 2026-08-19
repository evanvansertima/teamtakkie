import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'wedstrijden'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('tijd').nullable()
      table.string('locatie').nullable()
      table.text('notities').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('tijd')
      table.dropColumn('locatie')
      table.dropColumn('notities')
    })
  }
}
