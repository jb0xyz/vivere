import { createVivere } from '../../../../../../authoring/create-vivere.js'

const { defineCommand } = createVivere()

export default defineCommand({
  name: 'add',
  description: 'Add a user',
  async execute() {},
})
