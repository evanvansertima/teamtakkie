import Wedstrijd from '#models/wedstrijd'
import Tactiekplan from '#models/tactiekplan'
import { tactiekplanValidator } from '#validators/tactiekplan'
import type { HttpContext } from '@adonisjs/core/http'

export default class TactiekplannenController {
  async show({ params }: HttpContext) {
    return Tactiekplan.query().where('wedstrijd_id', params.wedstrijdId).first()
  }

  async update({ params, request }: HttpContext) {
    const wedstrijd = await Wedstrijd.findOrFail(params.wedstrijdId)
    const data = await request.validateUsing(tactiekplanValidator)
    let plan = await Tactiekplan.query().where('wedstrijd_id', wedstrijd.id).first()
    if (plan) {
      plan.merge(data)
      await plan.save()
    } else {
      plan = await wedstrijd.related('tactiekplan').create({ veldType: 'heel-h', ...data })
    }
    return plan
  }
}
