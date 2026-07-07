import { describe, expect, test, vi } from 'vitest'
import { createVivere } from './create-vivere.js'

const { defineCommand, opt } = createVivere<{ n: number }>()

describe('defineCommand', () => {
  test('returns a command definition with a descriptor', () => {
    const cmd = defineCommand({ name: 'ping', description: 'Pong', async execute() {} })
    expect(cmd.descriptor).toEqual({
      kind: 'command',
      name: 'ping',
      description: 'Pong',
      route: ['ping'],
      options: [],
    })
  })

  test('captures declared options and callable execute', async () => {
    const spy = vi.fn(async () => {})
    const cmd = defineCommand({
      name: 'demo',
      description: 'd',
      options: { note: opt.string('note') },
      execute: spy,
    })
    expect(cmd.descriptor.options).toEqual([
      {
        property: 'note',
        name: 'note',
        kind: 'string',
        description: 'note',
        required: true,
      },
    ])
    await cmd.execute({
      options: {},
      services: { n: 1 },
      components: { button: vi.fn() as never },
      reply: async () => {},
      defer: async () => {},
    })
    expect(spy).toHaveBeenCalledOnce()
  })
})
