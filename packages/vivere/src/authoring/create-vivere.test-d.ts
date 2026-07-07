import type { GuildMember, User } from 'discord.js'
import { expectTypeOf } from 'expect-type'
import { createVivere } from './create-vivere.js'
import { createApp } from '../runtime/create-app.js'

type Services = { logger: { info(msg: string): void } }
const { defineCommand, defineEvent, opt } = createVivere<Services>()

const demoCommand = defineCommand({
  name: 'demo',
  description: 'demo',
  options: { target: opt.user('target').optional(), note: opt.string('note') },
  async execute(ctx) {
    expectTypeOf(ctx.options.target).toEqualTypeOf<User | undefined>()
    expectTypeOf(ctx.options.note).toEqualTypeOf<string>()
    expectTypeOf(ctx.services).toEqualTypeOf<Services>()
    await ctx.reply('ok')
  },
})

const joinEvent = defineEvent({
  name: 'guildMemberAdd',
  async execute(ctx, member) {
    expectTypeOf(ctx.services).toEqualTypeOf<Services>()
    expectTypeOf(member).toEqualTypeOf<GuildMember>()
    ctx.services.logger.info(member.id)
  },
})

createApp({
  config: { token: 'token', intents: [] },
  createServices: async () => ({ logger: { info() {} }, extra: true }),
  commands: [demoCommand],
  events: [joinEvent],
})

createApp({
  config: { token: 'token', intents: [] },
  createServices: async () => ({ logger: { info() {} } }),
  commands: [demoCommand],
  events: [joinEvent],
})

createApp({
  config: { token: 'token', intents: [] },
  // @ts-expect-error commands require logger service
  createServices: async () => ({}),
  commands: [demoCommand],
  events: [joinEvent],
})

createApp({
  config: { token: 'token', intents: [] },
  // @ts-expect-error events require logger service
  createServices: async () => ({}),
  commands: [],
  events: [joinEvent],
})
