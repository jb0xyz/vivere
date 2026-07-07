import { expect, test, vi } from 'vitest'
import { createVivere } from '../authoring/create-vivere.js'
import { decodeCustomId, encodeCustomId } from '../components/custom-id.js'
import type { ButtonInteractionAdapter } from './interaction-adapter.js'
import type { ChatInputInteractionAdapter } from './interaction-adapter.js'
import { createRouter } from './router.js'

const secret = 'secret'
const { defineButton, defineCommand, opt, param } = createVivere<{ mark: () => void }>()

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
  const router = createRouter({ commands: [ping], buttons: [], secret })
  const adapter = fakeAdapter('ping')

  await router.dispatchCommand(adapter, { services: { mark } })

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
  const router = createRouter({ commands: [greet], buttons: [], secret })
  // Adapter is keyed by Discord option name (kebab-case).
  const adapter = fakeAdapter('greet', { 'target-user': 'abc', loud: true })

  await router.dispatchCommand(adapter, { services: { mark: () => {} } })

  expect(seen).toEqual({ targetUser: 'abc', loud: true })
})

test('passes required option presence to the adapter', async () => {
  const seenList: Array<{ name: string; required: boolean }> = []
  const inspect = defineCommand({
    name: 'inspect',
    description: 'inspect',
    options: {
      note: opt.string('note'),
      loud: opt.boolean('loud').optional(),
    },
    async execute() {},
  })
  const router = createRouter({ commands: [inspect], buttons: [], secret })
  const adapter: ChatInputInteractionAdapter = {
    commandName: 'inspect',
    getOption(name, _kind, required) {
      seenList.push({ name, required })
      return undefined
    },
    async reply() {},
    async deferReply() {},
  }

  await router.dispatchCommand(adapter, { services: { mark: () => {} } })

  expect(seenList).toEqual([
    { name: 'note', required: true },
    { name: 'loud', required: false },
  ])
})

test('ignores unknown command names', async () => {
  const router = createRouter({ commands: [], buttons: [], secret })
  const adapter = fakeAdapter('nope')
  await expect(router.dispatchCommand(adapter, { services: {} })).resolves.toBeUndefined()
})

test('dispatches a button with decoded params', async () => {
  let seen: unknown
  const mark = vi.fn()
  const confirm = defineButton({
    id: 'confirm',
    params: {
      userId: param.snowflake(),
      silent: param.boolean(),
    },
    async execute(ctx) {
      ctx.services.mark()
      seen = ctx.params
      await ctx.update('confirmed')
    },
  })
  const router = createRouter({ commands: [], buttons: [confirm], secret })
  const adapter = fakeButtonAdapter(
    encodeCustomId('confirm', { userId: '123456789012345678', silent: 'true' }, secret),
  )

  await router.dispatchButton(adapter, { services: { mark } })

  expect(mark).toHaveBeenCalledOnce()
  expect(seen).toEqual({ userId: '123456789012345678', silent: true })
  expect(adapter.updated).toEqual(['confirmed'])
})

test('ignores unknown or invalid button custom ids', async () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  const router = createRouter({ commands: [], buttons: [], secret })

  await router.dispatchButton(fakeButtonAdapter(encodeCustomId('missing', {}, secret)), {
    services: { mark: () => {} },
  })
  await router.dispatchButton(fakeButtonAdapter('c1:confirm:userId=123456789012345678:bad-signature'), {
    services: { mark: () => {} },
  })

  expect(warn).toHaveBeenCalledTimes(2)
  warn.mockRestore()
})

test('emits a typed button component with signed params', async () => {
  let customId = ''
  const confirm = defineButton({
    id: 'confirm',
    params: { userId: param.snowflake() },
    async execute() {},
  })
  const ask = defineCommand({
    name: 'ask',
    description: 'ask',
    async execute(ctx) {
      const row = ctx.components.button(confirm, {
        params: { userId: '123456789012345678' },
        label: 'Confirm',
      })
      const json = row.toJSON() as { components: Array<{ custom_id: string }> }
      customId = json.components[0]?.custom_id ?? ''
      await ctx.reply({ content: 'Confirm?', components: [row] })
    },
  })
  const router = createRouter({ commands: [ask], buttons: [confirm], secret })
  const adapter = fakeAdapter('ask')

  await router.dispatchCommand(adapter, { services: { mark: () => {} } })

  expect(decodeCustomId(customId, secret)).toEqual({
    id: 'confirm',
    params: { userId: '123456789012345678' },
  })
})

function fakeButtonAdapter(customId: string): ButtonInteractionAdapter & { updated: string[] } {
  const updated: string[] = []
  return {
    customId,
    updated,
    async update(input) {
      updated.push(typeof input === 'string' ? input : input.content)
    },
    async reply() {},
    async deferUpdate() {},
  }
}
