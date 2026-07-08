import { defineCommand } from '../app/vivere.js'
import confirmButton from '../components/confirm.js'
import pickRoleSelect from '../components/pick-role.js'

export default defineCommand({
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
        ctx.components.select(pickRoleSelect, {
          params: { userId: '123456789012345678' },
          placeholder: '역할 선택',
          options: [
            { label: 'Admin', value: 'admin' },
            { label: 'Mod', value: 'mod' },
          ],
        }),
      ],
    })
  },
})
