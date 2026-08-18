import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'tactiekplannen'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table
        .integer('wedstrijd_id')
        .unsigned()
        .notNullable()
        .unique()
        .references('id')
        .inTable('wedstrijden')
        .onDelete('CASCADE')
      table.string('veld_type').notNullable()
      table.json('tekening').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
