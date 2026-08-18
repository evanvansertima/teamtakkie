import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'spelers'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.string('naam').notNullable()
      table.string('rugnummer').nullable()
      table.string('positie').notNullable()
      table.string('positie2').nullable()
      table.string('favoriet_been').nullable()
      table.string('beschikbaar').notNullable().defaultTo('beschikbaar')
      table.json('skills').nullable()
      table.json('sterren').nullable()
      table.json('stats').nullable()
      table.string('foto_path').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
