import { defineMiddleware } from './vivere.js'

export const logMiddleware = defineMiddleware({
  name: 'log',
  async before(ctx, next) {
    ctx.services.logger.info(`user:${ctx.userId}`)
    return next()
  },
})
