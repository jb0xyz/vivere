export const CUSTOM_ID_MAX = 100
export const CUSTOM_ID_VERSION = 'c1'

export class CustomIdTooLongError extends Error {
  constructor(length: number) {
    super(`customId is ${length} chars (max ${CUSTOM_ID_MAX}). Use state mode instead.`)
    this.name = 'CustomIdTooLongError'
  }
}

export function encodeCustomId(id: string, params: Record<string, string>): string {
  const payload = new URLSearchParams(params).toString()
  const raw = `${CUSTOM_ID_VERSION}:${id}:${payload}`
  if (raw.length > CUSTOM_ID_MAX) throw new CustomIdTooLongError(raw.length)
  return raw
}

export function decodeCustomId(raw: string): { id: string; params: Record<string, string> } {
  const [version, id, payload = ''] = raw.split(':')
  if (version !== CUSTOM_ID_VERSION) throw new Error(`Unknown customId version: ${version}`)
  return { id, params: Object.fromEntries(new URLSearchParams(payload)) }
}
