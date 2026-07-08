import type { Client, GuildMember, User } from 'discord.js'
import { expectTypeOf } from 'expect-type'
import { createVivere } from './create-vivere.js'
import { createApp } from '../runtime/create-app.js'

type Services = { logger: { info(msg: string): void } }
const { defineButton, defineCommand, defineEvent, defineModal, definePlugin, defineSelect, field, opt, param } =
  createVivere<Services>()

const feedbackModal = defineModal({
  id: 'feedback',
  params: { userId: param.snowflake() },
  fields: {
    subject: field.short('Subject', { required: true, maxLength: 100 }),
    body: field.paragraph('Details'),
  },
  async execute(ctx) {
    expectTypeOf(ctx.params.userId).toEqualTypeOf<string>()
    expectTypeOf(ctx.fields.subject).toEqualTypeOf<string>()
    expectTypeOf(ctx.fields.body).toEqualTypeOf<string>()
    expectTypeOf(ctx.services).toEqualTypeOf<Services>()
    await ctx.reply({ content: ctx.fields.subject })
  },
})

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
    await ctx.showModal(feedbackModal, {
      params: { userId: ctx.params.userId },
      title: 'Feedback',
    })
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
    await ctx.showModal(feedbackModal, {
      params: { userId: ctx.params.userId },
      title: 'Feedback',
    })
    await ctx.update({ content: ctx.values.join(', ') })
  },
})

const demoCommand = defineCommand({
  name: 'demo',
  description: 'demo',
  options: {
    target: opt.user('target').optional(),
    note: opt.string('note'),
    query: opt.string('query').autocomplete(async (ctx, value) => {
      expectTypeOf(ctx.services).toEqualTypeOf<Services>()
      expectTypeOf(ctx.value).toEqualTypeOf<string>()
      expectTypeOf(value).toEqualTypeOf<string>()
      return [{ name: value, value }]
    }),
  },
  async execute(ctx) {
    expectTypeOf(ctx.options.target).toEqualTypeOf<User | undefined>()
    expectTypeOf(ctx.options.note).toEqualTypeOf<string>()
    expectTypeOf(ctx.options.query).toEqualTypeOf<string>()
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
    await ctx.showModal(feedbackModal, {
      params: { userId: '123456789012345678' },
      title: 'Feedback',
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

const demoPlugin = definePlugin({
  name: 'demo',
  commands: [demoCommand],
  events: [joinEvent],
  components: [confirmButton, pickRoleSelect, feedbackModal],
})

createApp({
  config: { token: 'token', intents: [] },
  createServices: async () => ({ logger: { info() {} }, extra: true }),
  commands: [demoCommand],
  buttons: [confirmButton],
  components: [pickRoleSelect, feedbackModal],
  events: [joinEvent],
  plugins: [demoPlugin],
})

createApp({
  config: { token: 'token', intents: [] },
  createServices: async () => ({ logger: { info() {} } }),
  commands: [demoCommand],
  buttons: [confirmButton],
  components: [pickRoleSelect, feedbackModal],
  events: [joinEvent],
  plugins: [demoPlugin],
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
  components: [pickRoleSelect, feedbackModal],
})

createApp({
  config: { token: 'token', intents: [] },
  // @ts-expect-error plugins require logger service
  createServices: async () => ({}),
  plugins: [demoPlugin],
})
