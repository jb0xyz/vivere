import { expect, test } from 'vitest'
import { createVivere } from '../authoring/create-vivere.js'
import { defineConfig } from './define-config.js'

test('returns the config unchanged with typed discovery paths', () => {
  const { defineCommand, definePlugin } = createVivere()
  const plugin = definePlugin({
    name: 'core',
    commands: [defineCommand({ name: 'plugin', description: 'Plugin command', async execute() {} })],
  })
  const config = defineConfig({
    discovery: {
      commands: 'src/commands',
      events: 'src/events',
      components: 'src/components',
    },
    devGuildId: '123',
    plugins: [plugin],
  })

  expect(config.discovery.commands).toBe('src/commands')
  expect(config.discovery.events).toBe('src/events')
  expect(config.discovery.components).toBe('src/components')
  expect(config.devGuildId).toBe('123')
  expect(config.plugins).toEqual([plugin])
})
