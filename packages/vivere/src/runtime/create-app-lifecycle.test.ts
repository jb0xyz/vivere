import { expect, test, vi } from 'vitest'
import { createVivere } from '../authoring/create-vivere.js'

const clientMock = vi.hoisted(() => {
  const ready = {
    application: {
      commands: {
        set: vi.fn(async () => ({})),
      },
    },
  }
  const client = {
    on: vi.fn(),
    once: vi.fn((name: string, listener: (value: unknown) => void) => {
      if (name === 'ready') queueMicrotask(() => listener(ready))
      return client
    }),
    login: vi.fn(async () => 'token'),
    destroy: vi.fn(),
  }
  return { client, ready }
})

vi.mock('discord.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('discord.js')>()),
  Client: vi.fn(() => clientMock.client),
}))

const { createApp } = await import('./create-app.js')

test('runs plugin setup and disposes plugin, services, then client', async () => {
  const callList: string[] = []
  const serviceDispose = vi.fn(async () => {
    callList.push('service')
  })
  const { defineCommand, definePlugin } = createVivere<{ logger: { info(message: string): void } }>()
  const ping = defineCommand({
    name: 'ping',
    description: 'Ping',
    async execute(ctx) {
      ctx.services.logger.info('ping')
      await ctx.reply('Pong!')
    },
  })
  const plugin = definePlugin({
    name: 'demo',
    commands: [ping],
    async setup() {
      callList.push('setup')
    },
    async dispose() {
      callList.push('plugin')
    },
  })
  const app = createApp({
    config: { token: 'token', intents: [], devGuildId: 'guild-1' },
    plugins: [plugin],
    async createServices() {
      return {
        services: {
          logger: {
            info() {},
          },
        },
        dispose: serviceDispose,
      }
    },
  })

  await app.start()
  const reply = vi.fn(async () => {})
  const interactionHandler = clientMock.client.on.mock.calls.find(([name]) => name === 'interactionCreate')?.[1] as
    | ((interaction: unknown) => void)
    | undefined
  interactionHandler?.({
    isAutocomplete: () => false,
    isChatInputCommand: () => true,
    isUserContextMenuCommand: () => false,
    isMessageContextMenuCommand: () => false,
    isButton: () => false,
    isStringSelectMenu: () => false,
    isModalSubmit: () => false,
    commandName: 'ping',
    user: { id: 'user-1' },
    guildId: 'guild-1',
    options: {
      getSubcommandGroup: () => undefined,
      getSubcommand: () => undefined,
    },
    reply,
    deferReply: vi.fn(async () => {}),
    showModal: vi.fn(async () => {}),
  })
  await vi.waitFor(() => expect(reply).toHaveBeenCalled())
  await app.stop()

  expect(callList).toEqual(['setup', 'plugin', 'service'])
  expect(clientMock.client.destroy).toHaveBeenCalledOnce()
})
