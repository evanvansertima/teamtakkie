import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'spelers'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.renameColumn('positie2', 'positie_2')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.renameColumn('positie_2', 'positie2')
    })
  }
}
