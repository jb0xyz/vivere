import { createVivere } from '../../../../authoring/create-vivere.js'

const { defineMessageCommand } = createVivere()

export default defineMessageCommand({
  name: 'Report Message',
  async execute() {},
})
