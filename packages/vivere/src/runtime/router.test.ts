import { expect, test, vi } from 'vitest'
import { createVivere } from '../authoring/create-vivere.js'
import { decodeCustomId, encodeCustomId } from '../components/custom-id.js'
import type { ButtonInteractionAdapter } from './interaction-adapter.js'
import type { ChatInputInteractionAdapter } from './interaction-adapter.js'
import type { SelectInteractionAdapter } from './interaction-adapter.js'
import { createRouter } from './router.js'

const secret = 'secret'
const { defineButton, defineCommand, defineSelect, opt, param } = createVivere<{ mark: () => void }>()

function fakeAdapter(
  commandName: string,
  options: Record<string, unknown> = {},
  route = [commandName],
): ChatInputInteractionAdapter & { replied: string[] } {
  const replied: string[] = []
  return {
    kind: 'command',
    commandName,
    route,
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
  const router = createRouter({ commands: [greet], buttons: [], secret })
  // Adapter is keyed by Discord option name (kebab-case).
  const adapter = fakeAdapter('greet', { 'target-user': 'abc', loud: true })

  await router.dispatch(adapter, { services: { mark: () => {} } })

  expect(seen).toEqual({ targetUser: 'abc', loud: true })
})

test('dispatches chat input commands by full route', async () => {
  const mark = vi.fn()
  const ban = defineCommand({
    name: 'ban',
    description: 'ban',
    async execute(ctx) {
      ctx.services.mark()
      await ctx.reply('banned')
    },
  })
  const routedBan = { ...ban, descriptor: { ...ban.descriptor, route: ['admin', 'ban'] } }
  const router = createRouter({ commands: [routedBan], buttons: [], secret })
  const adapter = fakeAdapter('admin', {}, ['admin', 'ban'])

  await router.dispatch(adapter, { services: { mark } })

  expect(mark).toHaveBeenCalledOnce()
  expect(adapter.replied).toEqual(['banned'])
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
    kind: 'command',
    commandName: 'inspect',
    route: ['inspect'],
    getOption(name, _kind, required) {
      seenList.push({ name, required })
      return undefined
    },
    async reply() {},
    async deferReply() {},
  }

  await router.dispatch(adapter, { services: { mark: () => {} } })

  expect(seenList).toEqual([
    { name: 'note', required: true },
    { name: 'loud', required: false },
  ])
})

test('ignores unknown command names', async () => {
  const router = createRouter({ commands: [], buttons: [], secret })
  const adapter = fakeAdapter('nope')
  await expect(router.dispatch(adapter, { services: {} })).resolves.toBeUndefined()
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
    encodeCustomId('button', 'confirm', { userId: '123456789012345678', silent: 'true' }, secret),
  )

  await router.dispatch(adapter, { services: { mark } })

  expect(mark).toHaveBeenCalledOnce()
  expect(seen).toEqual({ userId: '123456789012345678', silent: true })
  expect(adapter.updated).toEqual(['confirmed'])
})

test('dispatches a select with decoded params and selected values', async () => {
  let seen: unknown
  const mark = vi.fn()
  const pickRole = defineSelect({
    id: 'pick-role',
    params: { userId: param.snowflake() },
    async execute(ctx) {
      ctx.services.mark()
      seen = { params: ctx.params, values: ctx.values }
      await ctx.update('picked')
    },
  })
  const router = createRouter({ commands: [], components: [pickRole], secret })
  const adapter = fakeSelectAdapter(
    encodeCustomId('select', 'pick-role', { userId: '123456789012345678' }, secret),
    ['admin', 'mod'],
  )

  await router.dispatch(adapter, { services: { mark } })

  expect(mark).toHaveBeenCalledOnce()
  expect(seen).toEqual({ params: { userId: '123456789012345678' }, values: ['admin', 'mod'] })
  expect(adapter.updated).toEqual(['picked'])
})

test('reports rejected command handlers with command context', async () => {
  const error = new Error('command failed')
  const reportError = vi.fn()
  const fail = defineCommand({
    name: 'fail',
    description: 'fail',
    async execute() {
      throw error
    },
  })
  const router = createRouter({ commands: [fail], buttons: [], secret, reportError })

  await router.dispatch(fakeAdapter('fail'), { services: { mark: () => {} } })

  expect(reportError).toHaveBeenCalledWith(error, { phase: 'command', id: 'fail' })
})

test('ignores unknown or invalid button custom ids', async () => {
  const reportError = vi.fn()
  const router = createRouter({ commands: [], buttons: [], secret, reportError })

  await router.dispatch(fakeButtonAdapter(encodeCustomId('button', 'missing', {}, secret)), {
    services: { mark: () => {} },
  })
  await router.dispatch(fakeButtonAdapter('c1:button:confirm:userId=123456789012345678:bad-signature'), {
    services: { mark: () => {} },
  })

  expect(reportError).toHaveBeenCalledTimes(2)
  expect(reportError).toHaveBeenNthCalledWith(
    1,
    'Unknown component customId: button:missing',
    { phase: 'component', kind: 'button', id: 'missing' },
  )
  expect(reportError).toHaveBeenNthCalledWith(
    2,
    expect.any(Error),
    { phase: 'component', kind: 'button' },
  )
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
      customId = row.components[0]?.customId ?? ''
      await ctx.reply({ content: 'Confirm?', components: [row] })
    },
  })
  const router = createRouter({ commands: [ask], buttons: [confirm], secret })
  const adapter = fakeAdapter('ask')

  await router.dispatch(adapter, { services: { mark: () => {} } })

  expect(decodeCustomId(customId, secret)).toEqual({
    componentKind: 'button',
    id: 'confirm',
    params: { userId: '123456789012345678' },
  })
})

test('emits a typed select component with signed params', async () => {
  let customId = ''
  const pickRole = defineSelect({
    id: 'pick-role',
    params: { userId: param.snowflake() },
    async execute() {},
  })
  const ask = defineCommand({
    name: 'ask',
    description: 'ask',
    async execute(ctx) {
      const row = ctx.components.select(pickRole, {
        params: { userId: '123456789012345678' },
        placeholder: 'Choose',
        options: [{ label: 'Admin', value: 'admin' }],
      })
      customId = row.components[0]?.customId ?? ''
      await ctx.reply({ content: 'Pick', components: [row] })
    },
  })
  const router = createRouter({ commands: [ask], components: [pickRole], secret })
  const adapter = fakeAdapter('ask')

  await router.dispatch(adapter, { services: { mark: () => {} } })

  expect(decodeCustomId(customId, secret)).toEqual({
    componentKind: 'select',
    id: 'pick-role',
    params: { userId: '123456789012345678' },
  })
})

function fakeButtonAdapter(customId: string): ButtonInteractionAdapter & { updated: string[] } {
  const updated: string[] = []
  return {
    kind: 'button',
    customId,
    updated,
    async update(input) {
      updated.push(typeof input === 'string' ? input : input.content)
    },
    async reply() {},
    async deferUpdate() {},
  }
}

function fakeSelectAdapter(customId: string, values: string[]): SelectInteractionAdapter & { updated: string[] } {
  const updated: string[] = []
  return {
    kind: 'select',
    customId,
    values,
    updated,
    async update(input) {
      updated.push(typeof input === 'string' ? input : input.content)
    },
    async reply() {},
    async deferUpdate() {},
  }
}
