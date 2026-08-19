import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'trainingen'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.text('voorbereidingen').nullable()
      table.string('materialen').nullable()
      table.text('notities').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('voorbereidingen')
      table.dropColumn('materialen')
      table.dropColumn('notities')
    })
  }
}
