import Tactiek from '#models/tactiek'
import { tactiekValidator } from '#validators/tactiek'
import type { HttpContext } from '@adonisjs/core/http'

export default class TactiekenController {
  async index() {
    return Tactiek.query().orderBy('updatedAt', 'desc')
  }

  async store({ request }: HttpContext) {
    const data = await request.validateUsing(tactiekValidator)
    return Tactiek.create({ veldType: 'heel-h', ...data })
  }

  async show({ params }: HttpContext) {
    return Tactiek.findOrFail(params.id)
  }

  async update({ params, request }: HttpContext) {
    const tactiek = await Tactiek.findOrFail(params.id)
    const data = await request.validateUsing(tactiekValidator)
    tactiek.merge(data)
    await tactiek.save()
    return tactiek
  }

  async destroy({ params, response }: HttpContext) {
    const tactiek = await Tactiek.findOrFail(params.id)
    await tactiek.delete()
    return response.noContent()
  }
}
