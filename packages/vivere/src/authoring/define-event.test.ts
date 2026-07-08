import { describe, expect, test, vi } from 'vitest'
import { createVivere } from './create-vivere.js'

const { defineEvent } = createVivere<{ n: number }>()

describe('defineEvent', () => {
  test('returns an event definition with a descriptor', () => {
    const event = defineEvent({ name: 'ready', async execute() {} })

    expect(event.descriptor).toEqual({ kind: 'event', name: 'ready', once: false })
  })

  test('captures once and callable execute', async () => {
    const spy = vi.fn(async () => {})
    const event = defineEvent({
      name: 'guildMemberAdd',
      once: true,
      execute: spy,
    })

    await event.execute({ services: { n: 1 }, client: {} as never, userId: 'system' }, { id: 'member-1' })

    expect(event.descriptor.once).toBe(true)
    expect(spy).toHaveBeenCalledOnce()
  })
})
