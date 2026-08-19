import Wedstrijd from '#models/wedstrijd'
import Liveevent from '#models/liveevent'
import { liveeventValidator } from '#validators/liveevent'
import type { HttpContext } from '@adonisjs/core/http'

export default class LiveeventsController {
  async index({ params }: HttpContext) {
    const wedstrijd = await Wedstrijd.findOrFail(params.wedstrijdId)
    return wedstrijd.related('liveevents').query().preload('speler').orderBy('created_at', 'desc')
  }

  async store({ params, request }: HttpContext) {
    const wedstrijd = await Wedstrijd.findOrFail(params.wedstrijdId)
    const data = await request.validateUsing(liveeventValidator)
    const event = await wedstrijd.related('liveevents').create(data)
    if (event.spelerId) {
      await event.load('speler')
    }
    return event
  }

  async destroy({ params, response }: HttpContext) {
    const event = await Liveevent.findOrFail(params.id)
    await event.delete()
    return response.noContent()
  }
}
