import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'trainingen'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('tijd').nullable().alter()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('tijd').notNullable().alter()
    })
  }
}
