import { unlink } from 'node:fs/promises'
import { join } from 'node:path'
import app from '@adonisjs/core/services/app'
import Speler from '#models/speler'
import type { HttpContext } from '@adonisjs/core/http'

const UPLOAD_DIR = app.tmpPath('uploads/spelers')

async function verwijderBestaandeFoto(speler: Speler) {
  if (!speler.fotoPath) return
  try {
    await unlink(join(UPLOAD_DIR, speler.fotoPath))
  } catch {
    // Bestand al weg — niets te doen.
  }
}

export default class SpelerFotosController {
  async store({ params, request, response }: HttpContext) {
    const speler = await Speler.findOrFail(params.id)
    const foto = request.file('foto', {
      size: '5mb',
      extnames: ['jpg', 'jpeg', 'png', 'webp'],
    })
    if (!foto) return response.badRequest({ message: 'Geen foto ontvangen.' })
    if (!foto.isValid) return response.badRequest({ errors: foto.errors })

    await verwijderBestaandeFoto(speler)

    const bestandsnaam = `${speler.id}-${Date.now()}.${foto.extname}`
    await foto.move(UPLOAD_DIR, { name: bestandsnaam })

    speler.fotoPath = bestandsnaam
    await speler.save()
    return speler
  }

  async destroy({ params, response }: HttpContext) {
    const speler = await Speler.findOrFail(params.id)
    await verwijderBestaandeFoto(speler)
    speler.fotoPath = null
    await speler.save()
    return response.noContent()
  }

  async show({ params, response }: HttpContext) {
    const speler = await Speler.findOrFail(params.id)
    if (!speler.fotoPath) return response.notFound()
    response.header('Cache-Control', 'private, max-age=31536000, immutable')
    return response.download(join(UPLOAD_DIR, speler.fotoPath), true)
  }
}
