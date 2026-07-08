import { expectTypeOf } from 'expect-type'
import { createVivere } from '../authoring/create-vivere.js'
import { createTestBot } from './index.js'
import type { TestBot, TestRunResult } from './index.js'

const { defineCommand } = createVivere<{ logger: { info(message: string): void } }>()

const ping = defineCommand({
  name: 'ping',
  description: 'Ping',
  async execute(ctx) {
    expectTypeOf(ctx.services.logger.info).toBeFunction()
    await ctx.reply('Pong!')
  },
})

const bot = createTestBot({
  commands: [ping],
  services: {
    logger: {
      info() {},
    },
  },
})

expectTypeOf(bot).toEqualTypeOf<TestBot>()
expectTypeOf(bot.command('ping').run({ options: {} })).toEqualTypeOf<Promise<TestRunResult>>()

createTestBot({
  commands: [ping],
  createServices: async () => ({
    logger: {
      info() {},
    },
  }),
})

createTestBot({
  commands: [ping],
  // @ts-expect-error services must match command services
  services: {},
})
