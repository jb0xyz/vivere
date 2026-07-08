import { expect, test, vi } from 'vitest'
import { createVivere } from './create-vivere.js'
import { VivereUserError } from './middleware.js'
import { createTestBot } from '../testing/index.js'

const { defineButton, defineCommand, defineEvent, defineMiddleware, param } = createVivere<{
  logger: { info(message: string): void }
}>()

test('runs before middleware and merges typed extensions into command context', async () => {
  const auth = defineMiddleware({
    name: 'auth',
    async before(ctx, next) {
      return next({ auth: { userId: ctx.userId } })
    },
  })
  const ban = defineCommand({
    name: 'ban',
    description: 'Ban',
    use: [auth],
    async execute(ctx) {
      await ctx.reply({ content: ctx.auth.userId })
    },
  })
  const bot = createTestBot({ commands: [ban], services: { logger: { info() {} } } })

  const result = await bot.command('ban').run({ options: {}, userId: 'user-1' })

  expect(result.replies).toEqual([{ content: 'user-1' }])
})

test('stops execution when before middleware throws a user error', async () => {
  const execute = vi.fn()
  const guildOnly = defineMiddleware({
    name: 'guild-only',
    async before(ctx, next) {
      if (!ctx.guildId) throw new VivereUserError('Guild only')
      return next()
    },
  })
  const command = defineCommand({
    name: 'secure',
    description: 'Secure',
    use: [guildOnly],
    async execute(ctx) {
      execute()
      await ctx.reply('ok')
    },
  })
  const bot = createTestBot({ commands: [command], services: { logger: { info() {} } } })

  const result = await bot.command('secure').run({ options: {}, userId: 'user-1' })

  expect(execute).not.toHaveBeenCalled()
  expect(result.replies).toEqual([{ content: 'Guild only', ephemeral: true }])
})

test('runs after middleware after successful component execution', async () => {
  const after = vi.fn()
  const audit = defineMiddleware({
    name: 'audit',
    async after(ctx) {
      after(ctx.userId)
    },
  })
  const confirm = defineButton({
    id: 'confirm',
    params: { userId: param.snowflake() },
    use: [audit],
    async execute(ctx) {
      await ctx.update({ content: ctx.params.userId })
    },
  })
  const bot = createTestBot({ components: [confirm], services: { logger: { info() {} } } })

  const result = await bot
    .button('confirm', { params: { userId: '123456789012345678' } })
    .run({ userId: 'runner-1' })

  expect(result.updates).toEqual([{ content: '123456789012345678' }])
  expect(after).toHaveBeenCalledWith('runner-1')
})

test('lets middleware onError handle thrown errors', async () => {
  const seen = vi.fn()
  const catcher = defineMiddleware({
    name: 'catcher',
    onError(error, ctx) {
      seen(error, ctx.userId)
      return new VivereUserError('Handled')
    },
  })
  const command = defineCommand({
    name: 'fail',
    description: 'Fail',
    use: [catcher],
    async execute() {
      throw new Error('boom')
    },
  })
  const bot = createTestBot({ commands: [command], services: { logger: { info() {} } } })

  const result = await bot.command('fail').run({ options: {}, userId: 'user-1' })

  expect(seen).toHaveBeenCalledWith(expect.any(Error), 'user-1')
  expect(result.replies).toEqual([{ content: 'Handled', ephemeral: true }])
})

test('applies global middleware to events', async () => {
  const log = vi.fn()
  const global = defineMiddleware({
    name: 'global-log',
    async before(_ctx, next) {
      log('before')
      return next()
    },
    async after() {
      log('after')
    },
  })
  const ready = defineEvent({
    name: 'ready',
    async execute(ctx) {
      ctx.services.logger.info('ready')
    },
  })
  const bot = createTestBot({
    events: [ready],
    middleware: [global],
    services: { logger: { info() {} } },
  })

  await bot.event('ready').emit()

  expect(log).toHaveBeenNthCalledWith(1, 'before')
  expect(log).toHaveBeenNthCalledWith(2, 'after')
})

test('exposes stores to middleware', async () => {
  const limit = defineMiddleware({
    name: 'limit',
    async before(ctx, next) {
      const result = await ctx.stores.rateLimit.increment(ctx.userId, 1000)
      return next({ count: result.count })
    },
  })
  const command = defineCommand({
    name: 'limited',
    description: 'Limited',
    use: [limit],
    async execute(ctx) {
      await ctx.reply({ content: String(ctx.count) })
    },
  })
  const bot = createTestBot({ commands: [command], services: { logger: { info() {} } } })

  const first = await bot.command('limited').run({ options: {}, userId: 'user-1' })
  const second = await bot.command('limited').run({ options: {}, userId: 'user-1' })

  expect(first.replies).toEqual([{ content: '1' }])
  expect(second.replies).toEqual([{ content: '2' }])
})
