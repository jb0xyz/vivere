import { describe, expect, test, vi } from 'vitest'
import { createVivere } from './create-vivere.js'

const { defineEvent } = createVivere<{ n: number }>()

describe('defineEvent', () => {
  test('returns an event IR with once defaulting to false', () => {
    const event = defineEvent({ name: 'ready', async execute() {} })

    expect(event.kind).toBe('event')
    expect(event.name).toBe('ready')
    expect(event.once).toBe(false)
  })

  test('captures once and callable execute', async () => {
    const spy = vi.fn(async () => {})
    const event = defineEvent({
      name: 'guildMemberAdd',
      once: true,
      execute: spy,
    })

    await event.execute({ services: { n: 1 }, client: {} as never }, { id: 'member-1' })

    expect(event.once).toBe(true)
    expect(spy).toHaveBeenCalledOnce()
  })
})
