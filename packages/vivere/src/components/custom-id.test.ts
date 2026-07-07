import { describe, expect, test } from 'vitest'
import { CustomIdTooLongError, decodeCustomId, encodeCustomId } from './custom-id.js'

describe('customId', () => {
  test('two snowflakes stay within 100 chars and round-trip', () => {
    const raw = encodeCustomId('role-confirm', {
      userId: '123456789012345678',
      roleId: '876543210987654321',
    })
    expect(raw.length).toBeLessThanOrEqual(100)
    expect(decodeCustomId(raw)).toEqual({
      id: 'role-confirm',
      params: { userId: '123456789012345678', roleId: '876543210987654321' },
    })
  })

  test('throws when payload exceeds 100 chars', () => {
    expect(() => encodeCustomId('x', { blob: 'a'.repeat(200) })).toThrow(CustomIdTooLongError)
  })

  test('throws when id contains unsupported characters', () => {
    expect(() => encodeCustomId('role:confirm', {})).toThrow('Invalid customId id')
  })

  test('throws for malformed encoded values', () => {
    expect(() => decodeCustomId('c1')).toThrow('Malformed customId')
    expect(() => decodeCustomId('c1::')).toThrow('Missing customId id')
  })
})
