import { createHmac, timingSafeEqual } from 'node:crypto'

export const CUSTOM_ID_MAX = 100
export const CUSTOM_ID_VERSION = 'c1'
const SIGNATURE_LENGTH = 16

export class CustomIdTooLongError extends Error {
  constructor(length: number) {
    super(`customId is ${length} chars (max ${CUSTOM_ID_MAX}). Use state mode instead.`)
    this.name = 'CustomIdTooLongError'
  }
}

function createSignature(id: string, payload: string, secret: string): string {
  return createHmac('sha256', secret)
    .update(`${CUSTOM_ID_VERSION}:${id}:${payload}`)
    .digest('base64url')
    .slice(0, SIGNATURE_LENGTH)
}

function assertValidSignature(actual: string, expected: string): void {
  const actualBuffer = Buffer.from(actual)
  const expectedBuffer = Buffer.from(expected)
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) {
    throw new Error('Invalid customId signature')
  }
}

export function encodeCustomId(id: string, params: Record<string, string>, secret: string): string {
  if (!/^[a-z0-9-]+$/.test(id)) throw new Error(`Invalid customId id: ${id}`)
  const payload = new URLSearchParams(params).toString()
  const signature = createSignature(id, payload, secret)
  const raw = `${CUSTOM_ID_VERSION}:${id}:${payload}:${signature}`
  if (raw.length > CUSTOM_ID_MAX) throw new CustomIdTooLongError(raw.length)
  return raw
}

export function decodeCustomId(raw: string, secret: string): { id: string; params: Record<string, string> } {
  const parts = raw.split(':')
  if (parts.length !== 4) throw new Error('Malformed customId')
  const [version, id, payload, signature] = parts
  if (version !== CUSTOM_ID_VERSION) throw new Error(`Unknown customId version: ${version}`)
  if (!id) throw new Error('Missing customId id')
  assertValidSignature(signature ?? '', createSignature(id, payload ?? '', secret))
  return { id, params: Object.fromEntries(new URLSearchParams(payload)) }
}
