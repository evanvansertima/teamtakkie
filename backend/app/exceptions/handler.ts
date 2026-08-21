import app from '@adonisjs/core/services/app'
import { type HttpContext, ExceptionHandler } from '@adonisjs/core/http'

export default class HttpExceptionHandler extends ExceptionHandler {
  /**
   * In debug mode, the exception handler will display verbose errors
   * with pretty printed stack traces.
   */
  protected debug = !app.inProduction

  /**
   * The method is used for handling errors and returning
   * response to the client
   */
  async handle(error: unknown, ctx: HttpContext) {
    // Shield's default CSRF failure flashes session data and redirects,
    // which makes no sense for a JSON API — the frontend just needs a
    // clean error it can show and retry from.
    if (error instanceof Error && (error as { code?: string }).code === 'E_BAD_CSRF_TOKEN') {
      return ctx.response.status(403).send({ errors: [{ message: 'Sessie verlopen, herlaad de pagina.' }] })
    }
    return super.handle(error, ctx)
  }

  /**
   * The method is used to report error to the logging service or
   * the a third party error monitoring service.
   *
   * @note You should not attempt to send a response from this method.
   */
  async report(error: unknown, ctx: HttpContext) {
    return super.report(error, ctx)
  }
}
