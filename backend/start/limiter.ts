/*
|--------------------------------------------------------------------------
| Define HTTP limiters
|--------------------------------------------------------------------------
|
| The "limiter.define" method creates an HTTP middleware to apply rate
| limits on a route or a group of routes. Feel free to define as many
| throttle middleware as needed.
|
*/

import limiter from '@adonisjs/limiter/services/main'

/**
 * Guards the login route against brute-force attempts: 5 tries per minute
 * per IP, then blocked for 5 minutes. Single-admin app, so a genuine user
 * mistyping a password a few times is the only legitimate case this could
 * inconvenience.
 */
export const loginThrottle = limiter.define('login', () => {
  return limiter.allowRequests(5).every('1 minute').blockFor('5 minutes')
})