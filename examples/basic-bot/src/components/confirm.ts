import { defineButton, param } from '../app/vivere.js'

export default defineButton({
  id: 'confirm',
  params: { userId: param.snowflake() },
  async execute(ctx) {
    await ctx.update({ content: `확인: ${ctx.params.userId}` })
  },
})
