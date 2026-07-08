import { createVivere } from '../../../../../authoring/create-vivere.js'

const { defineCommand } = createVivere()

export default defineCommand({
  name: 'admin',
  description: 'Admin commands',
})
