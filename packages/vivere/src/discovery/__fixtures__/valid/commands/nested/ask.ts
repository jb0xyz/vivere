import { createVivere } from '../../../../../authoring/create-vivere.js'

const { defineCommand, opt } = createVivere()

export default defineCommand({
  name: 'ask',
  description: 'Ask',
  options: {
    targetUser: opt.user('target'),
  },
  async execute() {},
})
