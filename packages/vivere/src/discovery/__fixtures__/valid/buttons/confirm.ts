import { createVivere } from '../../../../authoring/create-vivere.js'

const { defineButton, param } = createVivere()

export default defineButton({
  id: 'confirm',
  params: {
    userId: param.snowflake(),
  },
  async execute() {},
})
