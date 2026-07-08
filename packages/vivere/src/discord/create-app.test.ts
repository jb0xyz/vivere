import { expect, test, vi } from 'vitest'
import { createVivere } from '../authoring/create-vivere.js'
import { handleInteraction, toChatInputAdapter } from './gateway-adapter.js'
import { createRouter } from '../runtime/router.js'

const { defineCommand, defineUserCommand } = createVivere<{ log: (m: string) => void }>()

test('translates a chat-input interaction and routes it', async () => {
  const log = vi.fn()
  const ping = defineCommand({
    name: 'ping',
    description: 'Pong',
    async execute(ctx) {
      ctx.services.log('hit')
      await ctx.reply('Pong!')
    },
  })
  const router = createRouter({ commands: [ping], buttons: [], secret: 'secret' })
  const reply = vi.fn(async () => {})

  const fakeInteraction = {
    isAutocomplete: () => false,
    isChatInputCommand: () => true,
    isUserContextMenuCommand: () => false,
    isMessageContextMenuCommand: () => false,
    isButton: () => false,
    isStringSelectMenu: () => false,
    isModalSubmit: () => false,
    commandName: 'ping',
    options: {
      getSubcommandGroup: () => null,
      getSubcommand: () => null,
    },
    reply,
    deferReply: async () => {},
    showModal: async () => {},
  }

  await handleInteraction(fakeInteraction as never, router, async () => ({ log }))

  expect(log).toHaveBeenCalledWith('hit')
  expect(reply).toHaveBeenCalledWith({ content: 'Pong!' })
})

test('translates a user context menu interaction and routes it', async () => {
  const log = vi.fn()
  const userInfo = defineUserCommand({
    name: 'User Info',
    async execute(ctx) {
      ctx.services.log(ctx.targetUser.username)
      await ctx.reply('ok')
    },
  })
  const router = createRouter({ commands: [userInfo], buttons: [], secret: 'secret' })
  const reply = vi.fn(async () => {})

  const fakeInteraction = {
    isAutocomplete: () => false,
    isChatInputCommand: () => false,
    isUserContextMenuCommand: () => true,
    isMessageContextMenuCommand: () => false,
    isButton: () => false,
    isStringSelectMenu: () => false,
    isModalSubmit: () => false,
    commandName: 'User Info',
    targetUser: { username: 'Ada' },
    reply,
    deferReply: async () => {},
  }

  await handleInteraction(fakeInteraction as never, router, async () => ({ log }))

  expect(log).toHaveBeenCalledWith('Ada')
  expect(reply).toHaveBeenCalledWith({ content: 'ok' })
})

test('ignores non-command interactions', async () => {
  const router = createRouter({ commands: [], buttons: [], secret: 'secret' })
  const fake = {
    isAutocomplete: () => false,
    isChatInputCommand: () => false,
    isUserContextMenuCommand: () => false,
    isMessageContextMenuCommand: () => false,
    isButton: () => false,
    isStringSelectMenu: () => false,
    isModalSubmit: () => false,
  }
  await expect(handleInteraction(fake as never, router, async () => ({}))).resolves.toBeUndefined()
})

test('builds chat input adapter route from subcommand data', () => {
  const interaction = {
    commandName: 'admin',
    options: {
      getSubcommandGroup: () => 'user',
      getSubcommand: () => 'add',
    },
    reply: async () => {},
    deferReply: async () => {},
    showModal: async () => {},
  }

  const adapter = toChatInputAdapter(interaction as never)

  expect(adapter.route).toEqual(['admin', 'user', 'add'])
})
