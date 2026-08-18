import Speler from '#models/speler'
import Rapport from '#models/rapport'
import { rapportValidator } from '#validators/rapport'
import type { HttpContext } from '@adonisjs/core/http'

export default class RapportenController {
  async index({ params }: HttpContext) {
    const speler = await Speler.findOrFail(params.spelerId)
    return speler.related('rapporten').query().orderBy('created_at', 'desc')
  }

  async store({ params, request }: HttpContext) {
    const speler = await Speler.findOrFail(params.spelerId)
    const data = await request.validateUsing(rapportValidator)
    return speler.related('rapporten').create(data)
  }

  async update({ params, request }: HttpContext) {
    const rapport = await Rapport.findOrFail(params.id)
    const data = await request.validateUsing(rapportValidator)
    rapport.merge(data)
    await rapport.save()
    return rapport
  }

  async destroy({ params, response }: HttpContext) {
    const rapport = await Rapport.findOrFail(params.id)
    await rapport.delete()
    return response.noContent()
  }
}
