import { describe, expect, test, vi } from 'vitest'
import { createVivere } from './create-vivere.js'

const { defineCommand, opt } = createVivere<{ n: number }>()

describe('defineCommand', () => {
  test('returns a command IR with defaults', () => {
    const cmd = defineCommand({ name: 'ping', description: 'Pong', async execute() {} })
    expect(cmd.kind).toBe('command')
    expect(cmd.name).toBe('ping')
    expect(cmd.description).toBe('Pong')
    expect(cmd.options).toEqual({})
  })

  test('captures declared options and callable execute', async () => {
    const spy = vi.fn(async () => {})
    const cmd = defineCommand({
      name: 'demo',
      description: 'd',
      options: { note: opt.string('note') },
      execute: spy,
    })
    expect(Object.keys(cmd.options)).toEqual(['note'])
    await cmd.execute({
      options: {},
      services: { n: 1 },
      reply: async () => {},
      defer: async () => {},
    })
    expect(spy).toHaveBeenCalledOnce()
  })
})
