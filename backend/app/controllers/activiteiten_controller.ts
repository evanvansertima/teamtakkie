import Activiteit from '#models/activiteit'
import { activiteitValidator } from '#validators/activiteit'
import type { HttpContext } from '@adonisjs/core/http'

export default class ActiviteitenController {
  async index({}: HttpContext) {
    return Activiteit.query().orderBy('datum', 'asc')
  }

  async store({ request }: HttpContext) {
    const data = await request.validateUsing(activiteitValidator)
    return Activiteit.create(data)
  }

  async update({ params, request }: HttpContext) {
    const activiteit = await Activiteit.findOrFail(params.id)
    const data = await request.validateUsing(activiteitValidator)
    activiteit.merge(data)
    await activiteit.save()
    return activiteit
  }

  async destroy({ params, response }: HttpContext) {
    const activiteit = await Activiteit.findOrFail(params.id)
    await activiteit.delete()
    return response.noContent()
  }
}
