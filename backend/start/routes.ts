/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'
import { controllers } from '#generated/controllers'
import SpelersController from '#controllers/spelers_controller'
import RapportenController from '#controllers/rapporten_controller'
import WedstrijdenController from '#controllers/wedstrijden_controller'
import DoelpuntenController from '#controllers/doelpunten_controller'
import KaartenController from '#controllers/kaarten_controller'
import TrainingenController from '#controllers/trainingen_controller'
import OnderdelenController from '#controllers/onderdelen_controller'
import AanwezighedenController from '#controllers/aanwezigheden_controller'
import LiveeventsController from '#controllers/liveevents_controller'
import ActiviteitenController from '#controllers/activiteiten_controller'

router.get('/api/health', () => {
  return { status: 'ok' }
})

router
  .group(() => {
    router
      .group(() => {
        router.post('login', [controllers.Session, 'store'])
      })
      .prefix('auth')
      .as('auth')

    router
      .group(() => {
        router.get('profile', [controllers.Profile, 'show'])
        router.post('logout', [controllers.Session, 'destroy'])
      })
      .prefix('account')
      .as('profile')
      .use(middleware.auth())

    router
      .group(() => {
        router.resource('spelers', SpelersController).apiOnly()
        router.get('spelers/:spelerId/rapporten', [RapportenController, 'index'])
        router.post('spelers/:spelerId/rapporten', [RapportenController, 'store'])
        router.put('rapporten/:id', [RapportenController, 'update'])
        router.delete('rapporten/:id', [RapportenController, 'destroy'])

        router.resource('wedstrijden', WedstrijdenController).apiOnly()
        router.post('wedstrijden/:wedstrijdId/doelpunten', [DoelpuntenController, 'store'])
        router.delete('doelpunten/:id', [DoelpuntenController, 'destroy'])
        router.post('wedstrijden/:wedstrijdId/kaarten', [KaartenController, 'store'])
        router.delete('kaarten/:id', [KaartenController, 'destroy'])

        router.resource('trainingen', TrainingenController).apiOnly()
        router.post('trainingen/:trainingId/onderdelen', [OnderdelenController, 'store'])
        router.put('onderdelen/:id', [OnderdelenController, 'update'])
        router.delete('onderdelen/:id', [OnderdelenController, 'destroy'])
        router.put('aanwezigheden/:id', [AanwezighedenController, 'update'])

        router.get('wedstrijden/:wedstrijdId/liveevents', [LiveeventsController, 'index'])
        router.post('wedstrijden/:wedstrijdId/liveevents', [LiveeventsController, 'store'])
        router.delete('liveevents/:id', [LiveeventsController, 'destroy'])

        router.resource('activiteiten', ActiviteitenController).apiOnly().except(['show'])
      })
      .use(middleware.auth())
  })
  .prefix('/api/v1')
