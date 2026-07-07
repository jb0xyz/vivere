import { describe, expect, test } from 'vitest'
import { CustomIdTooLongError, decodeCustomId, encodeCustomId } from './custom-id.js'

const secret = 'secret'

describe('customId', () => {
  test('two snowflakes stay within 100 chars and round-trip', () => {
    const raw = encodeCustomId(
      'role-confirm',
      {
        userId: '123456789012345678',
        roleId: '876543210987654321',
      },
      secret,
    )
    expect(raw.length).toBeLessThanOrEqual(100)
    expect(decodeCustomId(raw, secret)).toEqual({
      id: 'role-confirm',
      params: { userId: '123456789012345678', roleId: '876543210987654321' },
    })
  })

  test('throws when signed payload is changed', () => {
    const raw = encodeCustomId('confirm', { userId: '123456789012345678' }, secret)
    const tampered = raw.replace('123456789012345678', '876543210987654321')

    expect(() => decodeCustomId(tampered, secret)).toThrow('Invalid customId signature')
  })

  test('throws when signature is changed', () => {
    const raw = encodeCustomId('confirm', { userId: '123456789012345678' }, secret)
    const tampered = `${raw.slice(0, -1)}x`

    expect(() => decodeCustomId(tampered, secret)).toThrow('Invalid customId signature')
  })

  test('throws when payload exceeds 100 chars', () => {
    expect(() => encodeCustomId('x', { blob: 'a'.repeat(200) }, secret)).toThrow(CustomIdTooLongError)
  })

  test('throws when id contains unsupported characters', () => {
    expect(() => encodeCustomId('role:confirm', {}, secret)).toThrow('Invalid customId id')
  })

  test('throws for malformed encoded values', () => {
    expect(() => decodeCustomId('c1', secret)).toThrow('Malformed customId')
    expect(() => decodeCustomId('c1:::sig', secret)).toThrow('Missing customId id')
  })
})
