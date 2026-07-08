import { expect, test, vi } from 'vitest'
import { createVivere } from '../authoring/create-vivere.js'
import { handleInteraction, toChatInputAdapter } from './gateway-adapter.js'
import { createRouter } from '../runtime/router.js'

const { defineCommand } = createVivere<{ log: (m: string) => void }>()

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
    isChatInputCommand: () => true,
    isButton: () => false,
    commandName: 'ping',
    reply,
    deferReply: async () => {},
  }

  await handleInteraction(fakeInteraction as never, router, async () => ({ log }))

  expect(log).toHaveBeenCalledWith('hit')
  expect(reply).toHaveBeenCalledWith({ content: 'Pong!' })
})

test('ignores non-command interactions', async () => {
  const router = createRouter({ commands: [], buttons: [], secret: 'secret' })
  const fake = { isChatInputCommand: () => false, isButton: () => false, isStringSelectMenu: () => false }
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
  }

  const adapter = toChatInputAdapter(interaction as never)

  expect(adapter.route).toEqual(['admin', 'user', 'add'])
})
