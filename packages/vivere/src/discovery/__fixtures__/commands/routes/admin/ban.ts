import { createVivere } from '../../../../../authoring/create-vivere.js'

const { defineCommand, opt } = createVivere()

export default defineCommand({
  name: 'ban',
  description: 'Ban a user',
  options: { targetUser: opt.user('Target user') },
  async execute() {},
})
