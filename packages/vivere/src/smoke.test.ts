import { expect, test } from 'vitest'
import { createVivere } from './index.js'

test('package loads', () => {
  expect(createVivere).toBeTypeOf('function')
})
