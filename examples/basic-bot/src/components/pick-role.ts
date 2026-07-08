import { defineSelect, param } from '../app/vivere.js'

export default defineSelect({
  id: 'pick-role',
  params: { userId: param.snowflake() },
  async execute(ctx) {
    await ctx.update({ content: `선택: ${ctx.values.join(', ')}` })
  },
})
