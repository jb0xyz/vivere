import { defineCommand } from '../app/vivere.js'

export const pingCommand = defineCommand({
  name: 'ping',
  description: 'Pong을 반환',
  async execute(ctx) {
    ctx.services.logger.info('ping')
    await ctx.reply('Pong!')
  },
})
