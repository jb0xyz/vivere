import { defineCommand, definePlugin } from '../app/vivere.js'

const statusCommand = defineCommand({
  name: 'status',
  description: '봇 상태를 확인합니다',
  async execute(ctx) {
    ctx.services.logger.info('status')
    await ctx.reply('online')
  },
})

export default definePlugin({
  name: 'status',
  commands: [statusCommand],
})
