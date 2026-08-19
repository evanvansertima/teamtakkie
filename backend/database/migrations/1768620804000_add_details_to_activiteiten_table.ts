import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'activiteiten'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('locatie').nullable()
      table.string('tijd').nullable()
      table.string('eindtijd').nullable()
      table.text('notitie').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('locatie')
      table.dropColumn('tijd')
      table.dropColumn('eindtijd')
      table.dropColumn('notitie')
    })
  }
}
