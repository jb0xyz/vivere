import { createVivere } from '../../../../../authoring/create-vivere.js'

const { defineSelect, param } = createVivere()

export default defineSelect({
  id: 'pick-role',
  params: { userId: param.snowflake() },
  async execute() {},
})
