import { createVivere } from '../../../../authoring/create-vivere.js'

const { defineCommand } = createVivere()

export default defineCommand({
  name: 'different-name',
  description: 'Bad',
  async execute() {},
})
