import { expect, test } from 'vitest'
import { VERSION } from './index.js'

test('package loads', () => {
  expect(VERSION).toBe('0.0.0')
})
