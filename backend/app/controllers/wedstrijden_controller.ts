import Wedstrijd from '#models/wedstrijd'
import { wedstrijdValidator } from '#validators/wedstrijd'
import type { HttpContext } from '@adonisjs/core/http'

export default class WedstrijdenController {
  async index({}: HttpContext) {
    // Statistieken needs per-player goals/cards/appearances across the whole
    // season, and this dataset (one team's matches) is small enough that
    // preloading here beats adding a dedicated aggregate endpoint.
    return Wedstrijd.query()
      .preload('doelpunten')
      .preload('kaarten')
      .preload('opstellingrijen')
      .orderBy('datum', 'desc')
  }

  async store({ request }: HttpContext) {
    const data = await request.validateUsing(wedstrijdValidator)
    return Wedstrijd.create(data)
  }

  async show({ params }: HttpContext) {
    return Wedstrijd.query()
      .where('id', params.id)
      .preload('doelpunten', (q) => q.preload('scorerSpeler').preload('assistSpeler'))
      .preload('kaarten', (q) => q.preload('speler'))
      .preload('opstellingrijen', (q) => q.preload('speler'))
      .preload('motmSpeler')
      .firstOrFail()
  }

  async update({ params, request }: HttpContext) {
    const wedstrijd = await Wedstrijd.findOrFail(params.id)
    const data = await request.validateUsing(wedstrijdValidator)
    wedstrijd.merge(data)
    await wedstrijd.save()
    return wedstrijd
  }

  async destroy({ params, response }: HttpContext) {
    const wedstrijd = await Wedstrijd.findOrFail(params.id)
    await wedstrijd.delete()
    return response.noContent()
  }
}
