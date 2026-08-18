import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'oefeningen'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.string('naam').notNullable()
      table.string('type').notNullable()
      table.string('categorie').notNullable()
      table.string('doel').nullable()
      table.boolean('favoriet').notNullable().defaultTo(false)
      table.json('tekening').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
