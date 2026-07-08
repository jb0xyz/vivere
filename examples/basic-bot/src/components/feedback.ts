import { defineModal, field, param } from '../app/vivere.js'

export default defineModal({
  id: 'feedback',
  params: { userId: param.snowflake() },
  fields: {
    subject: field.short('제목', { required: true, maxLength: 100 }),
    body: field.paragraph('내용'),
  },
  async execute(ctx) {
    await ctx.reply({ content: `받았습니다: ${ctx.fields.subject}` })
  },
})
