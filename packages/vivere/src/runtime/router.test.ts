import { expect, test, vi } from 'vitest'
import { createVivere } from '../authoring/create-vivere.js'
import type { ChatInputInteractionAdapter } from './interaction-adapter.js'
import { createRouter } from './router.js'

const { defineCommand, opt } = createVivere<{ mark: () => void }>()

function fakeAdapter(
  commandName: string,
  options: Record<string, unknown> = {},
): ChatInputInteractionAdapter & { replied: string[] } {
  const replied: string[] = []
  return {
    commandName,
    replied,
    getOption(name) {
      return options[name]
    },
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

test('resolves declared options into ctx.options by their TS keys', async () => {
  let seen: unknown
  const greet = defineCommand({
    name: 'greet',
    description: 'greet',
    options: { targetUser: opt.string('who'), loud: opt.boolean('loud').optional() },
    async execute(ctx) {
      seen = ctx.options
      await ctx.reply('ok')
    },
  })
  const router = createRouter([greet])
  // Adapter is keyed by Discord option name (kebab-case).
  const adapter = fakeAdapter('greet', { 'target-user': 'abc', loud: true })

  await router.dispatch(adapter, { services: { mark: () => {} } })

  expect(seen).toEqual({ targetUser: 'abc', loud: true })
})

test('ignores unknown command names', async () => {
  const router = createRouter([])
  const adapter = fakeAdapter('nope')
  await expect(router.dispatch(adapter, { services: {} })).resolves.toBeUndefined()
})
