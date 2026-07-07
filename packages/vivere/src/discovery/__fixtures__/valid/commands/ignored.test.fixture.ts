import { createVivere } from '../../../../authoring/create-vivere.js'

const { defineCommand } = createVivere()

export default defineCommand({
  name: 'ignored',
  description: 'Ignored',
  async execute() {},
})
