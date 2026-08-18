import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'trainingen'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table
        .integer('seizoenblok_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('seizoenblokken')
        .onDelete('SET NULL')
      table.date('datum').notNullable()
      table.string('tijd').notNullable()
      table.string('locatie').nullable()
      table.integer('duur').notNullable()
      table.string('doelstellingen').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
