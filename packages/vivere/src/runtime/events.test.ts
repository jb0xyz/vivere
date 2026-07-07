import type { Client } from 'discord.js'
import { expect, test, vi } from 'vitest'
import { createVivere } from '../authoring/create-vivere.js'
import { registerEvents } from './events.js'

const { defineEvent } = createVivere<{ marker: string }>()

function createMockClient() {
  const listenerByKey = new Map<string, (...args: unknown[]) => void>()
  const client = {
    on: vi.fn((name: string, listener: (...args: unknown[]) => void) => {
      listenerByKey.set(`on:${name}`, listener)
      return client
    }),
    once: vi.fn((name: string, listener: (...args: unknown[]) => void) => {
      listenerByKey.set(`once:${name}`, listener)
      return client
    }),
  }

  return { client: client as unknown as Client, listenerByKey }
}

test('registers events with on or once by their flag', () => {
  const readyEvent = defineEvent({ name: 'ready', once: true, async execute() {} })
  const joinEvent = defineEvent({ name: 'guildMemberAdd', async execute() {} })
  const { client } = createMockClient()

  registerEvents(client, [readyEvent, joinEvent], async () => ({ marker: 'service' }))

  expect(client.once).toHaveBeenCalledWith('ready', expect.any(Function))
  expect(client.on).toHaveBeenCalledWith('guildMemberAdd', expect.any(Function))
})

test('calls event execute with services, client, and payload args', async () => {
  const execute = vi.fn(async () => {})
  const joinEvent = defineEvent({
    name: 'guildMemberAdd',
    execute,
  })
  const { client, listenerByKey } = createMockClient()
  const member = { id: 'member-1' }

  registerEvents(client, [joinEvent], async () => ({ marker: 'service' }))
  listenerByKey.get('on:guildMemberAdd')?.(member)
  await vi.waitFor(() => expect(execute).toHaveBeenCalledOnce())

  expect(execute).toHaveBeenCalledWith({ services: { marker: 'service' }, client }, member)
})

test('catches rejected event handlers at the boundary', async () => {
  const error = new Error('event failed')
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
  const event = defineEvent({
    name: 'ready',
    async execute() {
      throw error
    },
  })
  const { client, listenerByKey } = createMockClient()

  registerEvents(client, [event], async () => ({ marker: 'service' }))
  listenerByKey.get('on:ready')?.()
  await vi.waitFor(() => expect(consoleError).toHaveBeenCalledWith(error))

  consoleError.mockRestore()
})
