import { createVivere } from '../../../../authoring/create-vivere.js'

const { defineModal, field, param } = createVivere()

export default defineModal({
  id: 'feedback',
  params: { userId: param.snowflake() },
  fields: {
    subject: field.short('Subject', { required: true, maxLength: 100 }),
  },
  async execute() {},
})
