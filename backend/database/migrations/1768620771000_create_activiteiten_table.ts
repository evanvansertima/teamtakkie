import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'activiteiten'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.string('titel').notNullable()
      table.string('soort').notNullable()
      table.date('datum').notNullable()
      table.boolean('hele_dag').notNullable().defaultTo(false)
      table.string('herhaal').nullable()
      table.date('herhaal_tot').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
