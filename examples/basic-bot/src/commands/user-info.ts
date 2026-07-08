import { defineUserCommand } from '../app/vivere.js'

export default defineUserCommand({
  name: 'User Info',
  async execute(ctx) {
    await ctx.reply({
      content: ctx.targetUser.username,
      ephemeral: true,
    })
  },
})
