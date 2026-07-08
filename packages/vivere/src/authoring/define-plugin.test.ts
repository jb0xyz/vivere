import { expect, test } from 'vitest'
import { createVivere } from './create-vivere.js'

const { defineButton, defineCommand, defineEvent, definePlugin } = createVivere<{ mark(): void }>()

test('returns a plugin definition with grouped definitions', () => {
  const ping = defineCommand({ name: 'ping', description: 'Pong', async execute() {} })
  const ready = defineEvent({ name: 'ready', async execute() {} })
  const confirm = defineButton({ id: 'confirm', async execute() {} })

  const plugin = definePlugin({
    name: 'core',
    commands: [ping],
    events: [ready],
    components: [confirm],
  })

  expect(plugin).toEqual({
    name: 'core',
    commands: [ping],
    events: [ready],
    components: [confirm],
  })
})

test('defaults missing plugin definition lists to empty arrays', () => {
  expect(definePlugin({ name: 'empty' })).toEqual({
    name: 'empty',
    commands: [],
    events: [],
    components: [],
  })
})
