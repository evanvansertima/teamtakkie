import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'reviews'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table
        .integer('speler_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('spelers')
        .onDelete('CASCADE')
      table
        .integer('wedstrijd_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('wedstrijden')
        .onDelete('SET NULL')
      table.text('tekst').notNullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
