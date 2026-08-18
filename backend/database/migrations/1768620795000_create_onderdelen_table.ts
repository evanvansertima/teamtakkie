import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'onderdelen'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table
        .integer('training_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('trainingen')
        .onDelete('CASCADE')
      table
        .integer('oefening_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('oefeningen')
        .onDelete('SET NULL')
      table.string('naam').notNullable()
      table.integer('duur').nullable()
      table.json('tekening').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
