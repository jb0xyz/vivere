import { createPublicKey, verify } from 'node:crypto'

const ED25519_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex')

function createEd25519PublicKey(publicKey: string) {
  if (!/^[a-f0-9]{64}$/i.test(publicKey)) throw new Error('Invalid Discord public key')
  return createPublicKey({
    key: Buffer.concat([ED25519_SPKI_PREFIX, Buffer.from(publicKey, 'hex')]),
    format: 'der',
    type: 'spki',
  })
}

export function verifyDiscordSignature(input: {
  publicKey: string
  rawBody: string
  signature?: string
  timestamp?: string
}): boolean {
  if (!input.signature || !input.timestamp) return false
  if (!/^[a-f0-9]+$/i.test(input.signature)) return false

  try {
    return verify(
      null,
      Buffer.from(input.timestamp + input.rawBody),
      createEd25519PublicKey(input.publicKey),
      Buffer.from(input.signature, 'hex'),
    )
  } catch {
    return false
  }
}
