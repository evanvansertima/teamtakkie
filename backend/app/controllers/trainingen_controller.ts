import Training from '#models/training'
import Speler from '#models/speler'
import { trainingValidator } from '#validators/training'
import type { HttpContext } from '@adonisjs/core/http'

export default class TrainingenController {
  async index({}: HttpContext) {
    return Training.query().orderBy('datum', 'desc')
  }

  async store({ request }: HttpContext) {
    const data = await request.validateUsing(trainingValidator)
    const training = await Training.create(data)

    const spelers = await Speler.all()
    await training.related('aanwezigheden').createMany(
      spelers.map((speler) => ({ spelerId: speler.id, status: 'aanwezig' }))
    )

    return training
  }

  async show({ params }: HttpContext) {
    return Training.query()
      .where('id', params.id)
      .preload('onderdelen')
      .preload('aanwezigheden', (q) => q.preload('speler'))
      .firstOrFail()
  }

  async update({ params, request }: HttpContext) {
    const training = await Training.findOrFail(params.id)
    const data = await request.validateUsing(trainingValidator)
    training.merge(data)
    await training.save()
    return training
  }

  async destroy({ params, response }: HttpContext) {
    const training = await Training.findOrFail(params.id)
    await training.delete()
    return response.noContent()
  }
}
