import Wedstrijd from '#models/wedstrijd'
import Kaart from '#models/kaart'
import { kaartValidator } from '#validators/kaart'
import type { HttpContext } from '@adonisjs/core/http'

export default class KaartenController {
  async store({ params, request }: HttpContext) {
    const wedstrijd = await Wedstrijd.findOrFail(params.wedstrijdId)
    const data = await request.validateUsing(kaartValidator)
    const kaart = await wedstrijd.related('kaarten').create(data)
    await kaart.load('speler')
    return kaart
  }

  async destroy({ params, response }: HttpContext) {
    const kaart = await Kaart.findOrFail(params.id)
    await kaart.delete()
    return response.noContent()
  }
}
