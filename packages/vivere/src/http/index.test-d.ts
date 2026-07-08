import { expectTypeOf } from 'expect-type'
import { createVivere } from '../authoring/create-vivere.js'
import { createHttpHandler } from './index.js'
import type { HttpHandler, HttpHandlerInput, HttpHeaders, HttpResponse } from './index.js'

const { defineCommand } = createVivere<{ logger: { info(message: string): void } }>()

const ping = defineCommand({
  name: 'ping',
  description: 'Ping',
  async execute(ctx) {
    expectTypeOf(ctx.services.logger.info).toBeFunction()
    await ctx.reply('Pong!')
  },
})

const handler = createHttpHandler({
  publicKey: '00'.repeat(32),
  commands: [ping],
  services: {
    logger: {
      info() {},
    },
  },
})

expectTypeOf(handler).toEqualTypeOf<HttpHandler>()
expectTypeOf(handler('{}', {})).toEqualTypeOf<Promise<HttpResponse>>()

createHttpHandler({
  publicKey: '00'.repeat(32),
  commands: [ping],
  createServices: async () => ({
    logger: {
      info() {},
    },
  }),
})

createHttpHandler({
  publicKey: '00'.repeat(32),
  commands: [ping],
  // @ts-expect-error services must match command services
  services: {},
})

export type PublicHttpTypes = [
  HttpHandler,
  HttpHandlerInput<unknown>,
  HttpHeaders,
  HttpResponse,
]
