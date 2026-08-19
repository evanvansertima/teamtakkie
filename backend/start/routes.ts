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
      })
      .use(middleware.auth())
  })
  .prefix('/api/v1')
