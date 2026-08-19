import Aanwezigheid from '#models/aanwezigheid'
import { aanwezigheidValidator } from '#validators/aanwezigheid'
import type { HttpContext } from '@adonisjs/core/http'

export default class AanwezighedenController {
  async update({ params, request }: HttpContext) {
    const aanwezigheid = await Aanwezigheid.findOrFail(params.id)
    const data = await request.validateUsing(aanwezigheidValidator)
    aanwezigheid.merge(data)
    await aanwezigheid.save()
    return aanwezigheid
  }
}
