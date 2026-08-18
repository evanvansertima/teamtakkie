import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'wedstrijden'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.string('tegenstander').notNullable()
      table.timestamp('datum').notNullable()
      table.boolean('thuis').notNullable().defaultTo(true)
      table.string('status').notNullable().defaultTo('gepland')
      table.json('score').nullable()
      table
        .integer('motm_speler_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('spelers')
        .onDelete('SET NULL')
      table.string('formatie').nullable()
      table.integer('speelduur').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
