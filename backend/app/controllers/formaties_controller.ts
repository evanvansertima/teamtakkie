import Formatie from '#models/formatie'
import { formatieValidator } from '#validators/formatie'
import type { HttpContext } from '@adonisjs/core/http'

export default class FormatiesController {
  async index({}: HttpContext) {
    return Formatie.query().orderBy('created_at', 'desc')
  }

  async store({ request }: HttpContext) {
    const data = await request.validateUsing(formatieValidator)
    return Formatie.create(data)
  }

  async update({ params, request }: HttpContext) {
    const formatie = await Formatie.findOrFail(params.id)
    const data = await request.validateUsing(formatieValidator)
    formatie.merge(data)
    await formatie.save()
    return formatie
  }

  async destroy({ params, response }: HttpContext) {
    const formatie = await Formatie.findOrFail(params.id)
    await formatie.delete()
    return response.noContent()
  }
}
