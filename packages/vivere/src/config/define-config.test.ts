import { expect, test } from 'vitest'
import { defineConfig } from './define-config.js'

test('returns the config unchanged with typed discovery paths', () => {
  const config = defineConfig({
    discovery: {
      commands: 'src/commands',
      events: 'src/events',
      components: 'src/components',
    },
    devGuildId: '123',
  })

  expect(config.discovery.commands).toBe('src/commands')
  expect(config.discovery.events).toBe('src/events')
  expect(config.discovery.components).toBe('src/components')
  expect(config.devGuildId).toBe('123')
})
