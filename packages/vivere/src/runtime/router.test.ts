import { expect, test, vi } from 'vitest'
import { createVivere } from '../authoring/create-vivere.js'
import type { ChatInputInteractionAdapter } from './interaction-adapter.js'
import { createRouter } from './router.js'

const { defineCommand } = createVivere<{ mark: () => void }>()

function fakeAdapter(commandName: string): ChatInputInteractionAdapter & { replied: string[] } {
  const replied: string[] = []
  return {
    commandName,
    replied,
    async reply(input) {
      replied.push(typeof input === 'string' ? input : input.content)
    },
    async deferReply() {},
  }
}

test('dispatches to the matching command and builds ctx', async () => {
  const mark = vi.fn()
  const ping = defineCommand({
    name: 'ping',
    description: 'Pong',
    async execute(ctx) {
      ctx.services.mark()
      await ctx.reply('Pong!')
    },
  })
  const router = createRouter([ping])
  const adapter = fakeAdapter('ping')

  await router.dispatch(adapter, { services: { mark } })

  expect(mark).toHaveBeenCalledOnce()
  expect(adapter.replied).toEqual(['Pong!'])
})

test('ignores unknown command names', async () => {
  const router = createRouter([])
  const adapter = fakeAdapter('nope')
  await expect(router.dispatch(adapter, { services: {} })).resolves.toBeUndefined()
})
