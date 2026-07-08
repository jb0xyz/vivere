import { defineCommand, opt } from '../../app/vivere.js'

export default defineCommand({
  name: 'ban',
  description: '사용자를 차단합니다',
  options: {
    targetUser: opt.user('차단할 사용자'),
  },
  async execute(ctx) {
    await ctx.reply(`차단: ${ctx.options.targetUser.id}`)
  },
})
