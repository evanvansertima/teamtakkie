import { unlink } from 'node:fs/promises'
import { join } from 'node:path'
import app from '@adonisjs/core/services/app'

export const SPELER_FOTO_DIR = app.tmpPath('uploads/spelers')

export async function verwijderSpelerFoto(fotoPath: string | null) {
  if (!fotoPath) return
  try {
    await unlink(join(SPELER_FOTO_DIR, fotoPath))
  } catch {
    // Bestand al weg — niets te doen.
  }
}
