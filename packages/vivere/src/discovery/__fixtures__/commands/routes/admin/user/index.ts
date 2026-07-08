import { createVivere } from '../../../../../../authoring/create-vivere.js'

const { defineCommand } = createVivere()

export default defineCommand({
  name: 'user',
  description: 'User commands',
})
