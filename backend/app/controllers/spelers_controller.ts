import Speler from '#models/speler'
import { spelerValidator } from '#validators/speler'
import type { HttpContext } from '@adonisjs/core/http'

export default class SpelersController {
  async index({}: HttpContext) {
    return Speler.query().orderBy('naam', 'asc')
  }

  async store({ request }: HttpContext) {
    const data = await request.validateUsing(spelerValidator)
    return Speler.create(data)
  }

  async show({ params }: HttpContext) {
    return Speler.query().where('id', params.id).preload('rapporten').firstOrFail()
  }

  async update({ params, request }: HttpContext) {
    const speler = await Speler.findOrFail(params.id)
    const data = await request.validateUsing(spelerValidator)
    speler.merge(data)
    await speler.save()
    return speler
  }

  async destroy({ params, response }: HttpContext) {
    const speler = await Speler.findOrFail(params.id)
    await speler.delete()
    return response.noContent()
  }
}
