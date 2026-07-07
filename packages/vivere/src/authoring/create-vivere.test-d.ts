import type { User } from 'discord.js'
import { expectTypeOf } from 'expect-type'
import { createVivere } from './create-vivere.js'
import { createApp } from '../runtime/create-app.js'

type Services = { logger: { info(msg: string): void } }
const { defineCommand, opt } = createVivere<Services>()

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

createApp({
  config: { token: 'token', intents: [] },
  createServices: async () => ({ logger: { info() {} }, extra: true }),
  commands: [demoCommand],
})

createApp({
  config: { token: 'token', intents: [] },
  createServices: async () => ({ logger: { info() {} } }),
  commands: [demoCommand],
})

createApp({
  config: { token: 'token', intents: [] },
  // @ts-expect-error commands require logger service
  createServices: async () => ({}),
  commands: [demoCommand],
})
