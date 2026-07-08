import { expect, test, vi } from 'vitest'
import { createVivere } from '../authoring/create-vivere.js'
import { createTestBot } from './index.js'

const {
  defineButton,
  defineCommand,
  defineEvent,
  defineMessageCommand,
  defineModal,
  defineSelect,
  defineUserCommand,
  field,
  opt,
  param,
} = createVivere<{ logger: { info(message: string): void } }>()

test('runs command handlers and captures neutral replies', async () => {
  const ping = defineCommand({
    name: 'ping',
    description: 'Ping',
    async execute(ctx) {
      ctx.services.logger.info('ping')
      await ctx.reply('Pong!')
    },
  })
  const logger = { info: vi.fn() }
  const bot = createTestBot({ commands: [ping], services: { logger } })

  const result = await bot.command('ping').run({ options: {} })

  expect(logger.info).toHaveBeenCalledWith('ping')
  expect(result.replies).toEqual([{ content: 'Pong!' }])
  expect(result.updates).toEqual([])
  expect(result.defers).toEqual([])
})

test('runs subcommand routes with typed option values', async () => {
  const ban = defineCommand({
    name: 'ban',
    description: 'Ban',
    options: { targetUser: opt.user('Target') },
    async execute(ctx) {
      await ctx.reply({ content: String(ctx.options.targetUser) })
    },
  })
  const routedBan = { ...ban, descriptor: { ...ban.descriptor, route: ['admin', 'ban'] } }
  const bot = createTestBot({ commands: [routedBan], services: { logger: { info() {} } } })

  const result = await bot.command('admin ban').run({ options: { targetUser: '123' } })

  expect(result.replies).toEqual([{ content: '123' }])
})

test('runs component handlers through signed custom ids', async () => {
  const confirm = defineButton({
    id: 'confirm',
    params: { userId: param.snowflake() },
    async execute(ctx) {
      await ctx.update({ content: `ok ${ctx.params.userId}` })
    },
  })
  const pickRole = defineSelect({
    id: 'pick-role',
    params: { userId: param.snowflake() },
    async execute(ctx) {
      await ctx.update({ content: `${ctx.params.userId}:${ctx.values.join(',')}` })
    },
  })
  const feedback = defineModal({
    id: 'feedback',
    params: { userId: param.snowflake() },
    fields: { subject: field.short('Subject') },
    async execute(ctx) {
      await ctx.reply({ content: `${ctx.params.userId}:${ctx.fields.subject}` })
    },
  })
  const bot = createTestBot({
    components: [confirm, pickRole, feedback],
    services: { logger: { info() {} } },
  })

  const buttonResult = await bot.button('confirm', { params: { userId: '123456789012345678' } }).run()
  const selectResult = await bot
    .select('pick-role', { params: { userId: '123456789012345678' }, values: ['admin'] })
    .run()
  const modalResult = await bot
    .modal('feedback', { params: { userId: '123456789012345678' }, fields: { subject: 'hello' } })
    .run()

  expect(buttonResult.updates).toEqual([{ content: 'ok 123456789012345678' }])
  expect(selectResult.updates).toEqual([{ content: '123456789012345678:admin' }])
  expect(modalResult.replies).toEqual([{ content: '123456789012345678:hello' }])
})

test('captures modals shown from command handlers', async () => {
  const feedback = defineModal({
    id: 'feedback',
    params: { userId: param.snowflake() },
    fields: { subject: field.short('Subject') },
    async execute() {},
  })
  const openFeedback = defineCommand({
    name: 'feedback',
    description: 'Feedback',
    async execute(ctx) {
      await ctx.showModal(feedback, {
        params: { userId: '123456789012345678' },
        title: 'Feedback',
      })
    },
  })
  const bot = createTestBot({
    commands: [openFeedback],
    components: [feedback],
    services: { logger: { info() {} } },
  })

  const result = await bot.command('feedback').run({ options: {} })

  expect(result.modal).toMatchObject({
    title: 'Feedback',
    fields: [{ key: 'subject', label: 'Subject' }],
  })
})

test('runs autocomplete resolvers and captures choices', async () => {
  const search = defineCommand({
    name: 'search',
    description: 'Search',
    options: {
      query: opt.string('Query').autocomplete(async (ctx, value) => [
        { name: ctx.services.logger ? `Apple ${value}` : 'Apple', value: 'apple' },
      ]),
    },
    async execute() {},
  })
  const bot = createTestBot({ commands: [search], services: { logger: { info() {} } } })

  const choices = await bot.autocomplete('search', { option: 'query', value: 'ap' })

  expect(choices).toEqual([{ name: 'Apple ap', value: 'apple' }])
})

test('runs context menu commands', async () => {
  const userInfo = defineUserCommand({
    name: 'User Info',
    async execute(ctx) {
      await ctx.reply({ content: ctx.targetUser.username, ephemeral: true })
    },
  })
  const report = defineMessageCommand({
    name: 'Report',
    async execute(ctx) {
      await ctx.reply({ content: ctx.targetMessage.id })
    },
  })
  const bot = createTestBot({ commands: [userInfo, report], services: { logger: { info() {} } } })

  const userResult = await bot.userCommand('User Info').run({ targetUser: { username: 'Ada' } })
  const messageResult = await bot.messageCommand('Report').run({ targetMessage: { id: 'message-1' } })

  expect(userResult.replies).toEqual([{ content: 'Ada', ephemeral: true }])
  expect(messageResult.replies).toEqual([{ content: 'message-1' }])
})

test('emits event handlers with services', async () => {
  const logger = { info: vi.fn() }
  const ready = defineEvent({
    name: 'ready',
    async execute(ctx) {
      ctx.services.logger.info('ready')
    },
  })
  const bot = createTestBot({ events: [ready], services: { logger } })

  await bot.event('ready').emit({ user: { id: 'bot' } })

  expect(logger.info).toHaveBeenCalledWith('ready')
})
