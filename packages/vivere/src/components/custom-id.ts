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

export type ComponentKind = 'button' | 'select' | 'modal'

function createSignature(componentKind: ComponentKind, id: string, payload: string, secret: string): string {
  return createHmac('sha256', secret)
    .update(`${CUSTOM_ID_VERSION}:${componentKind}:${id}:${payload}`)
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

export function encodeCustomId(
  componentKind: ComponentKind,
  id: string,
  params: Record<string, string>,
  secret: string,
): string {
  if (!componentKind) throw new Error('Missing customId component kind')
  if (!/^[a-z0-9-]+$/.test(id)) throw new Error(`Invalid customId id: ${id}`)
  const payload = new URLSearchParams(params).toString()
  const signature = createSignature(componentKind, id, payload, secret)
  const raw = `${CUSTOM_ID_VERSION}:${componentKind}:${id}:${payload}:${signature}`
  if (raw.length > CUSTOM_ID_MAX) throw new CustomIdTooLongError(raw.length)
  return raw
}

export function decodeCustomId(
  raw: string,
  secret: string,
): { componentKind: ComponentKind; id: string; params: Record<string, string> } {
  const parts = raw.split(':')
  if (parts.length !== 5) throw new Error('Malformed customId')
  const [version, componentKind, id, payload, signature] = parts
  if (version !== CUSTOM_ID_VERSION) throw new Error(`Unknown customId version: ${version}`)
  if (!componentKind) throw new Error('Missing customId component kind')
  if (!id) throw new Error('Missing customId id')
  assertValidSignature(signature ?? '', createSignature(componentKind as ComponentKind, id, payload ?? '', secret))
  return { componentKind: componentKind as ComponentKind, id, params: Object.fromEntries(new URLSearchParams(payload)) }
}
