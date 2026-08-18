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
      })
      .use(middleware.auth())
  })
  .prefix('/api/v1')
