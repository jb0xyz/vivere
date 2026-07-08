import { expect, test, vi } from 'vitest'
import { createVivere } from '../authoring/create-vivere.js'
import type { ModalSpec } from '../authoring/types.js'
import { decodeCustomId, encodeCustomId } from '../components/custom-id.js'
import type { AutocompleteInteractionAdapter } from './interaction-adapter.js'
import type { ButtonInteractionAdapter } from './interaction-adapter.js'
import type { ChatInputInteractionAdapter } from './interaction-adapter.js'
import type { MessageCommandInteractionAdapter } from './interaction-adapter.js'
import type { ModalInteractionAdapter } from './interaction-adapter.js'
import type { SelectInteractionAdapter } from './interaction-adapter.js'
import type { UserCommandInteractionAdapter } from './interaction-adapter.js'
import { createRouter } from './router.js'

const secret = 'secret'
const { defineButton, defineCommand, defineMessageCommand, defineModal, defineSelect, defineUserCommand, field, opt, param } =
  createVivere<{ mark: () => void }>()

function fakeAdapter(
  commandName: string,
  options: Record<string, unknown> = {},
  route = [commandName],
): ChatInputInteractionAdapter & { replied: string[]; shownModals: ModalSpec[] } {
  const replied: string[] = []
  const shownModals: ModalSpec[] = []
  return {
    kind: 'command',
    commandName,
    route,
    replied,
    shownModals,
    getOption(name) {
      return options[name]
    },
    async reply(input) {
      replied.push(typeof input === 'string' ? input : input.content)
    },
    async deferReply() {},
    async showModal(input) {
      shownModals.push(input)
    },
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

test('dispatches a user context menu command with target user', async () => {
  let seen: unknown
  const mark = vi.fn()
  const userInfo = defineUserCommand({
    name: 'Info',
    async execute(ctx) {
      ctx.services.mark()
      seen = ctx.targetUser
      await ctx.reply('user')
    },
  })
  const slashInfo = defineCommand({ name: 'Info', description: 'Info', async execute() {} })
  const router = createRouter({ commands: [slashInfo, userInfo], buttons: [], secret })
  const adapter: UserCommandInteractionAdapter & { replied: string[] } = {
    kind: 'userCommand',
    commandName: 'Info',
    targetUser: { username: 'Ada' },
    replied: [],
    async reply(input) {
      this.replied.push(typeof input === 'string' ? input : input.content)
    },
    async deferReply() {},
  }

  await router.dispatch(adapter, { services: { mark } })

  expect(mark).toHaveBeenCalledOnce()
  expect(seen).toEqual({ username: 'Ada' })
  expect(adapter.replied).toEqual(['user'])
})

test('dispatches a message context menu command with target message', async () => {
  let seen: unknown
  const mark = vi.fn()
  const report = defineMessageCommand({
    name: 'Report',
    async execute(ctx) {
      ctx.services.mark()
      seen = ctx.targetMessage
      await ctx.reply({ content: 'reported', ephemeral: true })
    },
  })
  const router = createRouter({ commands: [report], buttons: [], secret })
  const adapter: MessageCommandInteractionAdapter & { replied: string[] } = {
    kind: 'messageCommand',
    commandName: 'Report',
    targetMessage: { id: 'message-1' },
    replied: [],
    async reply(input) {
      this.replied.push(typeof input === 'string' ? input : input.content)
    },
    async deferReply() {},
  }

  await router.dispatch(adapter, { services: { mark } })

  expect(mark).toHaveBeenCalledOnce()
  expect(seen).toEqual({ id: 'message-1' })
  expect(adapter.replied).toEqual(['reported'])
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
    async showModal() {},
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

test('dispatches autocomplete resolvers by route and focused option', async () => {
  const responded: unknown[] = []
  const search = defineCommand({
    name: 'search',
    description: 'search',
    options: {
      query: opt.string('query').autocomplete(async (ctx, value) => {
        ctx.services.mark()
        return [{ name: ctx.value, value }]
      }),
    },
    async execute() {},
  })
  const router = createRouter({ commands: [search], buttons: [], secret })
  const adapter: AutocompleteInteractionAdapter = {
    kind: 'autocomplete',
    commandName: 'search',
    route: ['search'],
    focusedName: 'query',
    focusedValue: 'app',
    async respond(choices) {
      responded.push(choices)
    },
  }
  const mark = vi.fn()

  await router.dispatch(adapter, { services: { mark } })

  expect(mark).toHaveBeenCalledOnce()
  expect(responded).toEqual([[{ name: 'app', value: 'app' }]])
})

test('responds with empty autocomplete choices when resolver fails', async () => {
  const error = new Error('resolver failed')
  const reportError = vi.fn()
  const responded: unknown[] = []
  const search = defineCommand({
    name: 'search',
    description: 'search',
    options: {
      query: opt.string('query').autocomplete(async () => {
        throw error
      }),
    },
    async execute() {},
  })
  const router = createRouter({ commands: [search], buttons: [], secret, reportError })

  await router.dispatch(
    {
      kind: 'autocomplete',
      commandName: 'search',
      route: ['search'],
      focusedName: 'query',
      focusedValue: 'app',
      async respond(choices) {
        responded.push(choices)
      },
    },
    { services: { mark: () => {} } },
  )

  expect(reportError).toHaveBeenCalledWith(error, { phase: 'command', id: 'search' })
  expect(responded).toEqual([[]])
})

test('dispatches a modal with decoded params and submitted fields', async () => {
  let seen: unknown
  const mark = vi.fn()
  const feedback = defineModal({
    id: 'feedback',
    params: { userId: param.snowflake() },
    fields: {
      subject: field.short('Subject', { required: true, maxLength: 100 }),
      body: field.paragraph('Details'),
    },
    async execute(ctx) {
      ctx.services.mark()
      seen = { params: ctx.params, fields: ctx.fields }
      await ctx.reply('thanks')
    },
  })
  const router = createRouter({ commands: [], components: [feedback], secret })
  const adapter: ModalInteractionAdapter & { replied: string[] } = {
    kind: 'modal',
    customId: encodeCustomId('modal', 'feedback', { userId: '123456789012345678' }, secret),
    fields: { subject: 'Hello', body: 'World' },
    replied: [],
    async reply(input) {
      this.replied.push(typeof input === 'string' ? input : input.content)
    },
    async defer() {},
  }

  await router.dispatch(adapter, { services: { mark } })

  expect(mark).toHaveBeenCalledOnce()
  expect(seen).toEqual({
    params: { userId: '123456789012345678' },
    fields: { subject: 'Hello', body: 'World' },
  })
  expect(adapter.replied).toEqual(['thanks'])
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

test('shows a modal with signed params from command ctx', async () => {
  const feedback = defineModal({
    id: 'feedback',
    params: { userId: param.snowflake() },
    fields: { subject: field.short('Subject', { required: true, maxLength: 100 }) },
    async execute() {},
  })
  const ask = defineCommand({
    name: 'ask-feedback',
    description: 'ask',
    async execute(ctx) {
      await ctx.showModal(feedback, {
        params: { userId: '123456789012345678' },
        title: 'Feedback',
      })
    },
  })
  const router = createRouter({ commands: [ask], components: [feedback], secret })
  const adapter = fakeAdapter('ask-feedback')

  await router.dispatch(adapter, { services: { mark: () => {} } })

  expect(adapter.shownModals).toHaveLength(1)
  const modal = adapter.shownModals[0]
  expect(modal).toMatchObject({
    title: 'Feedback',
    fields: [{ key: 'subject', label: 'Subject', style: 'short', required: true, maxLength: 100 }],
  })
  expect(decodeCustomId(modal?.customId ?? '', secret)).toEqual({
    componentKind: 'modal',
    id: 'feedback',
    params: { userId: '123456789012345678' },
  })
})

function fakeButtonAdapter(customId: string): ButtonInteractionAdapter & { updated: string[]; shownModals: ModalSpec[] } {
  const updated: string[] = []
  const shownModals: ModalSpec[] = []
  return {
    kind: 'button',
    customId,
    updated,
    shownModals,
    async update(input) {
      updated.push(typeof input === 'string' ? input : input.content)
    },
    async reply() {},
    async deferUpdate() {},
    async showModal(input) {
      shownModals.push(input)
    },
  }
}

function fakeSelectAdapter(customId: string, values: string[]): SelectInteractionAdapter & { updated: string[]; shownModals: ModalSpec[] } {
  const updated: string[] = []
  const shownModals: ModalSpec[] = []
  return {
    kind: 'select',
    customId,
    values,
    updated,
    shownModals,
    async update(input) {
      updated.push(typeof input === 'string' ? input : input.content)
    },
    async reply() {},
    async deferUpdate() {},
    async showModal(input) {
      shownModals.push(input)
    },
  }
}
