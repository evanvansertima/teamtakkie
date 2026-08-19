import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'standrijen'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('doel_voor').notNullable().defaultTo(0)
      table.integer('doel_tegen').notNullable().defaultTo(0)
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('doel_voor')
      table.dropColumn('doel_tegen')
    })
  }
}
