/**
 * SQLite has no native JSON type — table.json() migrations just create a
 * TEXT column, and Lucid does not auto-serialize for those. Every model
 * with JSON columns calls these from @beforeSave/@afterFind/@afterFetch
 * hooks so callers always see real objects, never JSON strings.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function serializeJsonColumns(model: any, columns: string[]) {
  for (const col of columns) {
    const value = model[col]
    if (value !== null && value !== undefined && typeof value !== 'string') {
      model[col] = JSON.stringify(value)
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseJsonColumns(model: any, columns: string[]) {
  for (const col of columns) {
    const value = model[col]
    if (typeof value === 'string') {
      model[col] = JSON.parse(value)
    }
  }
}
