import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'toernooiwedstrijden'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table
        .integer('toernooi_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('toernooien')
        .onDelete('CASCADE')
      table
        .integer('thuis_team_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('toernooiteams')
        .onDelete('CASCADE')
      table
        .integer('uit_team_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('toernooiteams')
        .onDelete('CASCADE')
      table.timestamp('datum').nullable()
      table.integer('score_thuis').nullable()
      table.integer('score_uit').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
