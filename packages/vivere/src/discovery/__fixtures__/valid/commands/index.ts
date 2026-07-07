import { createVivere } from '../../../../authoring/create-vivere.js'

const { defineCommand } = createVivere()

export default defineCommand({
  name: 'index',
  description: 'Ignored',
  async execute() {},
})
