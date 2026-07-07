import type { User } from 'discord.js'
import { expectTypeOf } from 'expect-type'
import { createVivere } from './create-vivere.js'

type Services = { logger: { info(msg: string): void } }
const { defineCommand, opt } = createVivere<Services>()

defineCommand({
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
