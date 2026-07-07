import { defineCommand } from '../app/vivere.js'
import { confirmButton } from '../components/confirm.js'

export const askCommand = defineCommand({
  name: 'ask',
  description: '확인 버튼을 보냅니다',
  async execute(ctx) {
    await ctx.reply({
      content: 'Confirm?',
      components: [
        ctx.components.button(confirmButton, {
          params: { userId: '123456789012345678' },
          label: 'Confirm',
        }),
      ],
    })
  },
})
