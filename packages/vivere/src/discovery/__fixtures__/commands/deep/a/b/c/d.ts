import { createVivere } from '../../../../../../../authoring/create-vivere.js'

const { defineCommand } = createVivere()

export default defineCommand({
  name: 'd',
  description: 'Too deep',
  async execute() {},
})
