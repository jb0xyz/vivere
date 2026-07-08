import type { Client, GuildMember, User } from 'discord.js'
import { expectTypeOf } from 'expect-type'
import { createVivere } from './create-vivere.js'
import { createApp } from '../runtime/create-app.js'

type Services = { logger: { info(msg: string): void } }
const { defineButton, defineCommand, defineEvent, defineSelect, opt, param } = createVivere<Services>()

const confirmButton = defineButton({
  id: 'confirm',
  params: {
    userId: param.snowflake(),
    silent: param.boolean(),
    mode: param.enum(['approve', 'deny'] as const),
  },
  async execute(ctx) {
    expectTypeOf(ctx.params.userId).toEqualTypeOf<string>()
    expectTypeOf(ctx.params.silent).toEqualTypeOf<boolean>()
    expectTypeOf(ctx.params.mode).toEqualTypeOf<'approve' | 'deny'>()
    expectTypeOf(ctx.services).toEqualTypeOf<Services>()
    await ctx.update({ content: ctx.params.userId })
  },
})

const pickRoleSelect = defineSelect({
  id: 'pick-role',
  params: { userId: param.snowflake() },
  async execute(ctx) {
    expectTypeOf(ctx.params.userId).toEqualTypeOf<string>()
    expectTypeOf(ctx.values).toEqualTypeOf<string[]>()
    expectTypeOf(ctx.services).toEqualTypeOf<Services>()
    await ctx.update({ content: ctx.values.join(', ') })
  },
})

const demoCommand = defineCommand({
  name: 'demo',
  description: 'demo',
  options: { target: opt.user('target').optional(), note: opt.string('note') },
  async execute(ctx) {
    expectTypeOf(ctx.options.target).toEqualTypeOf<User | undefined>()
    expectTypeOf(ctx.options.note).toEqualTypeOf<string>()
    expectTypeOf(ctx.services).toEqualTypeOf<Services>()
    ctx.components.button(confirmButton, {
      params: { userId: '123456789012345678', silent: false, mode: 'approve' },
      label: 'Confirm',
    })
    ctx.components.button(confirmButton, {
      // @ts-expect-error mode only accepts declared enum values
      params: { userId: '123456789012345678', silent: false, mode: 'skip' },
      label: 'Confirm',
    })
    ctx.components.select(pickRoleSelect, {
      params: { userId: '123456789012345678' },
      placeholder: 'Choose',
      options: [{ label: 'Admin', value: 'admin' }],
    })
    await ctx.reply('ok')
  },
})

const joinEvent = defineEvent({
  name: 'guildMemberAdd',
  async execute(ctx, member) {
    expectTypeOf(ctx.services).toEqualTypeOf<Services>()
    expectTypeOf(ctx.client).toEqualTypeOf<Client>()
    expectTypeOf(member).toEqualTypeOf<GuildMember>()
    ctx.services.logger.info(member.id)
  },
})

createApp({
  config: { token: 'token', intents: [] },
  createServices: async () => ({ logger: { info() {} }, extra: true }),
  commands: [demoCommand],
  buttons: [confirmButton],
  components: [pickRoleSelect],
  events: [joinEvent],
})

createApp({
  config: { token: 'token', intents: [] },
  createServices: async () => ({ logger: { info() {} } }),
  commands: [demoCommand],
  buttons: [confirmButton],
  components: [pickRoleSelect],
  events: [joinEvent],
})

createApp({
  config: { token: 'token', intents: [] },
  // @ts-expect-error commands require logger service
  createServices: async () => ({}),
  commands: [demoCommand],
  buttons: [confirmButton],
  events: [joinEvent],
})

createApp({
  config: { token: 'token', intents: [] },
  // @ts-expect-error events require logger service
  createServices: async () => ({}),
  commands: [],
  buttons: [],
  events: [joinEvent],
})

createApp({
  config: { token: 'token', intents: [] },
  // @ts-expect-error buttons require logger service
  createServices: async () => ({}),
  commands: [],
  buttons: [confirmButton],
})

createApp({
  config: { token: 'token', intents: [] },
  // @ts-expect-error components require logger service
  createServices: async () => ({}),
  commands: [],
  components: [pickRoleSelect],
})
