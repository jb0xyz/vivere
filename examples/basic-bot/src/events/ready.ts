import { defineEvent } from '../app/vivere.js'

export default defineEvent({
  name: 'ready',
  once: true,
  async execute(ctx) {
    ctx.services.logger.info('online')
  },
})
