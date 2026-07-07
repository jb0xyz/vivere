import { expect, test } from 'vitest'
import { assertUnique, createRegistry } from './collections.js'

test('assertUnique throws with the duplicate item', () => {
  expect(() => assertUnique(['ping', 'ask', 'ping'], 'command name')).toThrow('Duplicate command name "ping"')
})

test('createRegistry keys items by the selected value', () => {
  const registry = createRegistry(
    [
      { descriptor: { name: 'ping' } },
      { descriptor: { name: 'ask' } },
    ],
    (item) => item.descriptor.name,
  )

  expect(registry.get('ping')?.descriptor.name).toBe('ping')
  expect(registry.get('ask')?.descriptor.name).toBe('ask')
})
