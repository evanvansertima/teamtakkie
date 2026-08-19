import Wedstrijd from '#models/wedstrijd'
import Opstellingrij from '#models/opstellingrij'
import { opstellingrijValidator, opstellingrijUpdateValidator } from '#validators/opstellingrij'
import type { HttpContext } from '@adonisjs/core/http'

export default class OpstellingrijenController {
  // One player per position slot per match — assigning a new player to an
  // already-filled slot replaces the previous assignment rather than
  // stacking rows, matching how the Tactieken formation board behaves.
  async store({ params, request }: HttpContext) {
    const wedstrijd = await Wedstrijd.findOrFail(params.wedstrijdId)
    const data = await request.validateUsing(opstellingrijValidator)

    await wedstrijd.related('opstellingrijen').query().where('positie_id', data.positieId).delete()

    const rij = await wedstrijd.related('opstellingrijen').create(data)
    await rij.load('speler')
    return rij
  }

  async update({ params, request }: HttpContext) {
    const rij = await Opstellingrij.findOrFail(params.id)
    const data = await request.validateUsing(opstellingrijUpdateValidator)
    rij.merge(data)
    await rij.save()
    return rij
  }

  async destroy({ params, response }: HttpContext) {
    const rij = await Opstellingrij.findOrFail(params.id)
    await rij.delete()
    return response.noContent()
  }
}
