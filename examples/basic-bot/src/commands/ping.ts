import { defineCommand } from '../app/vivere.js'
import { logMiddleware } from '../app/middleware.js'

export default defineCommand({
  name: 'ping',
  description: 'Pong을 반환',
  use: [logMiddleware],
  async execute(ctx) {
    ctx.services.logger.info('ping')
    await ctx.reply('Pong!')
  },
})
