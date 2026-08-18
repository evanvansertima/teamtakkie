import { BaseSeeder } from '@adonisjs/lucid/seeders'
import env from '#start/env'
import User from '#models/user'

/**
 * Single-admin app: there is no public signup route, so the one
 * account is created here from env vars. Idempotent — safe to
 * re-run against an existing database.
 */
export default class extends BaseSeeder {
  async run() {
    await User.updateOrCreate(
      { email: env.get('ADMIN_EMAIL') },
      {
        fullName: env.get('ADMIN_NAME', 'Trainer'),
        password: env.get('ADMIN_PASSWORD'),
      }
    )
  }
}