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

/**
 * SQLite also has no native boolean type — writes coerce JS booleans to
 * 0/1 fine via the driver, but reads come back as raw 0/1 integers unless
 * cast back explicitly. Only needed in @afterFind/@afterFetch; the write
 * path already round-trips correctly.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseBooleanColumns(model: any, columns: string[]) {
  for (const col of columns) {
    const value = model[col]
    if (typeof value === 'number') {
      model[col] = value === 1
    }
  }
}
