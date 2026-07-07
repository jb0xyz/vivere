import { createVivere } from '../../../../authoring/create-vivere.js'

const { defineCommand } = createVivere()

export default defineCommand({
  name: 'ping',
  description: 'Pong',
  async execute() {},
})
