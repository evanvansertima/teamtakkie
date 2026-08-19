import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'tactiekplannen'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.text('plan').nullable()
      table.text('balbezit').nullable()
      table.text('balverlies').nullable()
      table.text('omschakeling').nullable()
      table.json('instructies').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('plan')
      table.dropColumn('balbezit')
      table.dropColumn('balverlies')
      table.dropColumn('omschakeling')
      table.dropColumn('instructies')
    })
  }
}
