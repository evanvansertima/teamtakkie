import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'rapporten'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.json('sterren').nullable()
      table.string('positie').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('sterren')
      table.dropColumn('positie')
    })
  }
}
