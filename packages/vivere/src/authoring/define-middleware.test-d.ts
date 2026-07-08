import { expectTypeOf } from 'expect-type'
import { createVivere } from './create-vivere.js'

type Services = { logger: { info(message: string): void } }

const { defineCommand, defineMiddleware } = createVivere<Services>()

const auth = defineMiddleware({
  name: 'auth',
  async before(ctx, next) {
    expectTypeOf(ctx.userId).toEqualTypeOf<string>()
    expectTypeOf(ctx.guildId).toEqualTypeOf<string | undefined>()
    expectTypeOf(ctx.services).toEqualTypeOf<Services>()
    return next({ auth: { userId: ctx.userId } })
  },
})

defineCommand({
  name: 'secure',
  description: 'Secure',
  use: [auth],
  async execute(ctx) {
    expectTypeOf(ctx.auth.userId).toEqualTypeOf<string>()
    expectTypeOf(ctx.services).toEqualTypeOf<Services>()
    await ctx.reply(ctx.auth.userId)
  },
})
