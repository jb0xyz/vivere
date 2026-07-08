import { afterEach, expect, test, vi } from 'vitest'
import { createVivere } from './create-vivere.js'
import { cooldown, rateLimit, requirePermission, requireRole } from './policies.js'
import { buildManifest } from '../manifest/manifest.js'
import { createTestBot } from '../testing/index.js'

const { defineButton, defineCommand, param } = createVivere<{ logger: { info(message: string): void } }>()

afterEach(() => {
  vi.useRealTimers()
})

test('allows handlers when permission and role policies pass', async () => {
  const execute = vi.fn()
  const ban = defineCommand({
    name: 'ban',
    description: 'Ban',
    policies: [requirePermission('BanMembers'), requireRole('moderator')],
    async execute(ctx) {
      execute()
      await ctx.reply({ content: ctx.locale ?? 'none' })
    },
  })
  const bot = createTestBot({ commands: [ban], services: { logger: { info() {} } } })

  const result = await bot.command('ban').run({
    options: {},
    locale: 'ko',
    member: { roles: ['moderator'], permissions: ['BanMembers'] },
  })

  expect(execute).toHaveBeenCalledOnce()
  expect(result.replies).toEqual([{ content: 'ko' }])
})

test('blocks handlers when permission policies fail', async () => {
  const execute = vi.fn()
  const ban = defineCommand({
    name: 'ban',
    description: 'Ban',
    policies: [requirePermission('BanMembers')],
    async execute(ctx) {
      execute()
      await ctx.reply('banned')
    },
  })
  const bot = createTestBot({ commands: [ban], services: { logger: { info() {} } } })

  const result = await bot.command('ban').run({ options: {}, member: { roles: [], permissions: [] } })

  expect(execute).not.toHaveBeenCalled()
  expect(result.replies).toEqual([{ content: 'Missing permission: BanMembers', ephemeral: true }])
})

test('blocks repeated command runs during cooldown windows', async () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
  const command = defineCommand({
    name: 'ping',
    description: 'Ping',
    policies: [cooldown({ scope: 'user', window: '5s' })],
    async execute(ctx) {
      await ctx.reply('Pong!')
    },
  })
  const bot = createTestBot({ commands: [command], services: { logger: { info() {} } } })

  const first = await bot.command('ping').run({ options: {}, userId: 'user-1' })
  const second = await bot.command('ping').run({ options: {}, userId: 'user-1' })
  vi.advanceTimersByTime(5001)
  const third = await bot.command('ping').run({ options: {}, userId: 'user-1' })

  expect(first.replies).toEqual([{ content: 'Pong!' }])
  expect(second.replies).toEqual([{ content: 'Cooldown active. Try again in 5s.', ephemeral: true }])
  expect(third.replies).toEqual([{ content: 'Pong!' }])
})

test('blocks command runs above the configured rate limit', async () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
  const command = defineCommand({
    name: 'search',
    description: 'Search',
    policies: [rateLimit({ scope: 'user', limit: 2, window: '10s' })],
    async execute(ctx) {
      await ctx.reply('ok')
    },
  })
  const bot = createTestBot({ commands: [command], services: { logger: { info() {} } } })

  const first = await bot.command('search').run({ options: {}, userId: 'user-1' })
  const second = await bot.command('search').run({ options: {}, userId: 'user-1' })
  const third = await bot.command('search').run({ options: {}, userId: 'user-1' })

  expect(first.replies).toEqual([{ content: 'ok' }])
  expect(second.replies).toEqual([{ content: 'ok' }])
  expect(third.replies).toEqual([{ content: 'Rate limit exceeded. Try again in 10s.', ephemeral: true }])
})

test('applies policies to component handlers', async () => {
  const confirm = defineButton({
    id: 'confirm',
    params: { userId: param.snowflake() },
    policies: [requireRole('moderator')],
    async execute(ctx) {
      await ctx.update({ content: ctx.params.userId })
    },
  })
  const bot = createTestBot({ components: [confirm], services: { logger: { info() {} } } })

  const result = await bot
    .button('confirm', { params: { userId: '123456789012345678' } })
    .run({ member: { roles: [], permissions: [] } })

  expect(result.replies).toEqual([{ content: 'Missing role: moderator', ephemeral: true }])
  expect(result.updates).toEqual([])
})

test('serializes policy descriptors into the manifest', () => {
  const command = defineCommand({
    name: 'ban',
    description: 'Ban',
    policies: [requirePermission('BanMembers'), cooldown({ scope: 'user', window: '5s' })],
    async execute() {},
  })

  const manifest = buildManifest({ commands: [command.descriptor], events: [], components: [] })

  expect(manifest.commands[0]).toMatchObject({
    policies: [
      { type: 'permission', value: 'BanMembers' },
      { type: 'cooldown', scope: 'user', windowMs: 5000 },
    ],
  })
})
