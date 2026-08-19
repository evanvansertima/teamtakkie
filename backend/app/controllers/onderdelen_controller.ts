import Training from '#models/training'
import Onderdeel from '#models/onderdeel'
import { onderdeelValidator } from '#validators/onderdeel'
import type { HttpContext } from '@adonisjs/core/http'

export default class OnderdelenController {
  async store({ params, request }: HttpContext) {
    const training = await Training.findOrFail(params.trainingId)
    const data = await request.validateUsing(onderdeelValidator)
    return training.related('onderdelen').create(data)
  }

  async update({ params, request }: HttpContext) {
    const onderdeel = await Onderdeel.findOrFail(params.id)
    const data = await request.validateUsing(onderdeelValidator)
    onderdeel.merge(data)
    await onderdeel.save()
    return onderdeel
  }

  async destroy({ params, response }: HttpContext) {
    const onderdeel = await Onderdeel.findOrFail(params.id)
    await onderdeel.delete()
    return response.noContent()
  }
}
