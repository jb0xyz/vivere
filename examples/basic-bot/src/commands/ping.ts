import { defineCommand } from '../app/vivere.js'

export default defineCommand({
  name: 'ping',
  description: 'Pong을 반환',
  async execute(ctx) {
    ctx.services.logger.info('ping')
    await ctx.reply('Pong!')
  },
})
