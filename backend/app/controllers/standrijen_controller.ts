import Standrij from '#models/standrij'
import { standrijValidator } from '#validators/standrij'
import type { HttpContext } from '@adonisjs/core/http'

export default class StandrijenController {
  async index({}: HttpContext) {
    return Standrij.query().orderBy('naam', 'asc')
  }

  async store({ request }: HttpContext) {
    const data = await request.validateUsing(standrijValidator)
    return Standrij.create(data)
  }

  async update({ params, request }: HttpContext) {
    const rij = await Standrij.findOrFail(params.id)
    const data = await request.validateUsing(standrijValidator)
    rij.merge(data)
    await rij.save()
    return rij
  }

  async destroy({ params, response }: HttpContext) {
    const rij = await Standrij.findOrFail(params.id)
    await rij.delete()
    return response.noContent()
  }
}
