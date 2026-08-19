import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'onderdelen'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('type').nullable()
      table.string('doel').nullable()
      table.integer('aantal_spelers').nullable()
      table.string('veld_grootte').nullable()
      table.string('materialen').nullable()
      table.text('beschrijving').nullable()
      table.text('aandachtspunten').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('type')
      table.dropColumn('doel')
      table.dropColumn('aantal_spelers')
      table.dropColumn('veld_grootte')
      table.dropColumn('materialen')
      table.dropColumn('beschrijving')
      table.dropColumn('aandachtspunten')
    })
  }
}
