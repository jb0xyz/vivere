import { generateKeyPairSync, sign } from 'node:crypto'
import type { KeyObject } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { expect, test, vi } from 'vitest'
import { createVivere } from '../authoring/create-vivere.js'
import { encodeCustomId } from '../components/custom-id.js'
import { createHttpHandler } from './index.js'

const { defineButton, defineCommand, opt, param } = createVivere<{ logger: { info(message: string): void } }>()

function createSigningKeys() {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519')
  const publicDer = publicKey.export({ format: 'der', type: 'spki' })
  return {
    publicKey: Buffer.from(publicDer).subarray(-32).toString('hex'),
    privateKey,
  }
}

function signRawBody(privateKey: KeyObject, rawBody: string, timestamp = '1700000000') {
  return {
    'x-signature-ed25519': sign(null, Buffer.from(timestamp + rawBody), privateKey).toString('hex'),
    'x-signature-timestamp': timestamp,
  }
}

async function request(
  handler: ReturnType<typeof createHttpHandler<{ logger: { info(message: string): void } }>>,
  privateKey: KeyObject,
  payload: unknown,
) {
  const rawBody = JSON.stringify(payload)
  return handler(rawBody, signRawBody(privateKey, rawBody))
}

function parseBody(response: { body: string }) {
  return JSON.parse(response.body) as unknown
}

test('declares the http subpath export', async () => {
  const packagePath = fileURLToPath(new URL('../../package.json', import.meta.url))
  const packageJson = JSON.parse(await readFile(packagePath, 'utf8')) as {
    exports: Record<string, { types: string; import: string }>
  }

  expect(packageJson.exports['./http']).toEqual({
    types: './dist/http.d.ts',
    import: './dist/http.js',
  })
})

test('rejects requests with invalid signatures', async () => {
  const { publicKey } = createSigningKeys()
  const handler = createHttpHandler({
    publicKey,
    commands: [],
    services: { logger: { info() {} } },
  })

  const response = await handler(JSON.stringify({ type: 1 }), {
    'x-signature-ed25519': 'bad',
    'x-signature-timestamp': '1700000000',
  })

  expect(response).toEqual({ status: 401, body: '' })
})

test('responds to signed ping interactions with pong', async () => {
  const { publicKey, privateKey } = createSigningKeys()
  const handler = createHttpHandler({
    publicKey,
    commands: [],
    services: { logger: { info() {} } },
  })

  const response = await request(handler, privateKey, { type: 1 })

  expect(response.status).toBe(200)
  expect(parseBody(response)).toEqual({ type: 1 })
})

test('dispatches signed chat input interactions and returns an interaction response', async () => {
  const logger = { info: vi.fn() }
  const ping = defineCommand({
    name: 'ping',
    description: 'Ping',
    options: { note: opt.string('Note') },
    async execute(ctx) {
      ctx.services.logger.info(ctx.userId)
      await ctx.reply({ content: `Pong ${ctx.options.note}`, ephemeral: true })
    },
  })
  const { publicKey, privateKey } = createSigningKeys()
  const handler = createHttpHandler({
    publicKey,
    commands: [ping],
    services: { logger },
  })

  const response = await request(handler, privateKey, {
    type: 2,
    guild_id: 'guild-1',
    member: { user: { id: 'user-1' } },
    data: {
      type: 1,
      name: 'ping',
      options: [{ name: 'note', type: 3, value: 'hello' }],
    },
  })

  expect(logger.info).toHaveBeenCalledWith('user-1')
  expect(response.status).toBe(200)
  expect(parseBody(response)).toEqual({
    type: 4,
    data: { content: 'Pong hello', flags: 64 },
  })
})

test('returns deferred responses from command handlers', async () => {
  const defer = defineCommand({
    name: 'defer',
    description: 'Defer',
    async execute(ctx) {
      await ctx.defer({ ephemeral: true })
    },
  })
  const { publicKey, privateKey } = createSigningKeys()
  const handler = createHttpHandler({
    publicKey,
    commands: [defer],
    services: { logger: { info() {} } },
  })

  const response = await request(handler, privateKey, {
    type: 2,
    user: { id: 'user-1' },
    data: { type: 1, name: 'defer' },
  })

  expect(parseBody(response)).toEqual({
    type: 5,
    data: { flags: 64 },
  })
})

test('dispatches signed autocomplete interactions', async () => {
  const search = defineCommand({
    name: 'search',
    description: 'Search',
    options: {
      query: opt.string('Query').autocomplete((_ctx, value) => [{ name: `Apple ${value}`, value: 'apple' }]),
    },
    async execute() {},
  })
  const { publicKey, privateKey } = createSigningKeys()
  const handler = createHttpHandler({
    publicKey,
    commands: [search],
    services: { logger: { info() {} } },
  })

  const response = await request(handler, privateKey, {
    type: 4,
    user: { id: 'user-1' },
    data: {
      type: 1,
      name: 'search',
      options: [{ name: 'query', type: 3, value: 'ap', focused: true }],
    },
  })

  expect(parseBody(response)).toEqual({
    type: 8,
    data: { choices: [{ name: 'Apple ap', value: 'apple' }] },
  })
})

test('dispatches signed component interactions and returns update responses', async () => {
  const customIdSecret = 'component-secret'
  const confirm = defineButton({
    id: 'confirm',
    params: { userId: param.snowflake() },
    async execute(ctx) {
      await ctx.update({ content: `ok ${ctx.params.userId}` })
    },
  })
  const { publicKey, privateKey } = createSigningKeys()
  const handler = createHttpHandler({
    publicKey,
    customIdSecret,
    components: [confirm],
    services: { logger: { info() {} } },
  })

  const response = await request(handler, privateKey, {
    type: 3,
    user: { id: 'user-1' },
    data: {
      component_type: 2,
      custom_id: encodeCustomId('button', 'confirm', { userId: '123456789012345678' }, customIdSecret),
    },
  })

  expect(parseBody(response)).toEqual({
    type: 7,
    data: { content: 'ok 123456789012345678' },
  })
})

test('rejects components registered without a customIdSecret', () => {
  const confirm = defineButton({
    id: 'confirm',
    params: { userId: param.snowflake() },
    async execute(ctx) {
      await ctx.update({ content: `ok ${ctx.params.userId}` })
    },
  })
  const { publicKey } = createSigningKeys()
  expect(() =>
    createHttpHandler({ publicKey, components: [confirm], services: { logger: { info() {} } } }),
  ).toThrow(/customIdSecret is required/)
})
