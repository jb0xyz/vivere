import { createVivere } from '../../../../authoring/create-vivere.js'

const { defineEvent } = createVivere()

export default defineEvent({
  name: 'ready',
  once: true,
  async execute() {},
})
