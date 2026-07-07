import { defineEvent } from '../app/vivere.js'

export const readyEvent = defineEvent({
  name: 'ready',
  once: true,
  async execute(ctx) {
    ctx.services.logger.info('online')
  },
})
