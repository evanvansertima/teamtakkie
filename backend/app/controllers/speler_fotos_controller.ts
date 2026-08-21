import { join } from 'node:path'
import Speler from '#models/speler'
import { SPELER_FOTO_DIR, verwijderSpelerFoto } from '#models/speler_foto'
import type { HttpContext } from '@adonisjs/core/http'

export default class SpelerFotosController {
  async store({ params, request, response }: HttpContext) {
    const speler = await Speler.findOrFail(params.id)
    const foto = request.file('foto', {
      size: '5mb',
      extnames: ['jpg', 'jpeg', 'png', 'webp'],
    })
    if (!foto) return response.badRequest({ message: 'Geen foto ontvangen.' })
    if (!foto.isValid) return response.badRequest({ errors: foto.errors })

    await verwijderSpelerFoto(speler.fotoPath)

    const bestandsnaam = `${speler.id}-${Date.now()}.${foto.extname}`
    await foto.move(SPELER_FOTO_DIR, { name: bestandsnaam })

    speler.fotoPath = bestandsnaam
    await speler.save()
    return speler
  }

  async destroy({ params, response }: HttpContext) {
    const speler = await Speler.findOrFail(params.id)
    await verwijderSpelerFoto(speler.fotoPath)
    speler.fotoPath = null
    await speler.save()
    return response.noContent()
  }

  async show({ params, response }: HttpContext) {
    const speler = await Speler.findOrFail(params.id)
    if (!speler.fotoPath) return response.notFound()
    response.header('Cache-Control', 'private, max-age=31536000, immutable')
    return response.download(join(SPELER_FOTO_DIR, speler.fotoPath), true)
  }
}
