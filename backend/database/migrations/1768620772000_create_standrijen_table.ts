import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'standrijen'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.string('naam').notNullable()
      table.integer('gespeeld').notNullable().defaultTo(0)
      table.integer('winst').notNullable().defaultTo(0)
      table.integer('gelijk').notNullable().defaultTo(0)
      table.integer('verlies').notNullable().defaultTo(0)

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
