import Wedstrijd from '#models/wedstrijd'
import Doelpunt from '#models/doelpunt'
import { doelpuntValidator } from '#validators/doelpunt'
import type { HttpContext } from '@adonisjs/core/http'

export default class DoelpuntenController {
  async store({ params, request }: HttpContext) {
    const wedstrijd = await Wedstrijd.findOrFail(params.wedstrijdId)
    const data = await request.validateUsing(doelpuntValidator)
    const doelpunt = await wedstrijd.related('doelpunten').create(data)
    await doelpunt.load('scorerSpeler')
    if (doelpunt.assistSpelerId) {
      await doelpunt.load('assistSpeler')
    }
    return doelpunt
  }

  async destroy({ params, response }: HttpContext) {
    const doelpunt = await Doelpunt.findOrFail(params.id)
    await doelpunt.delete()
    return response.noContent()
  }
}
