import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'wissels'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table
        .integer('wedstrijd_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('wedstrijden')
        .onDelete('CASCADE')
      table
        .integer('uit_speler_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('spelers')
        .onDelete('CASCADE')
      table
        .integer('in_speler_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('spelers')
        .onDelete('CASCADE')
      table.integer('minuut').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
