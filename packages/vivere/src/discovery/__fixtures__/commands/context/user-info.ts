import { createVivere } from '../../../../authoring/create-vivere.js'

const { defineUserCommand } = createVivere()

export default defineUserCommand({
  name: 'User Info',
  async execute() {},
})
