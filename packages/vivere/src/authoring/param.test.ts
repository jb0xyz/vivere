import { describe, expect, test } from 'vitest'
import { param } from './param.js'

describe('param', () => {
  test('round-trips snowflake values', () => {
    const node = param.snowflake()

    expect(node.encode('123456789012345678')).toBe('123456789012345678')
    expect(node.decode('123456789012345678')).toBe('123456789012345678')
  })

  test('guards string max length', () => {
    const node = param.string(3)

    expect(node.encode('abc')).toBe('abc')
    expect(() => node.decode('abcd')).toThrow('exceeds max length')
  })

  test('round-trips boolean values', () => {
    const node = param.boolean()

    expect(node.encode(true)).toBe('true')
    expect(node.encode(false)).toBe('false')
    expect(node.decode('true')).toBe(true)
    expect(node.decode('false')).toBe(false)
    expect(() => node.decode('yes')).toThrow('Invalid boolean param')
  })

  test('round-trips enum values', () => {
    const node = param.enum(['approve', 'deny'] as const)

    expect(node.encode('approve')).toBe('approve')
    expect(node.decode('deny')).toBe('deny')
    expect(() => node.decode('skip')).toThrow('Invalid enum param')
  })
})
