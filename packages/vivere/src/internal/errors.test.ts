import { expect, test, vi } from 'vitest'
import { reportError } from './errors.js'

test('reports errors through the default console sink', () => {
  const error = new Error('failed')
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

  reportError(error, { phase: 'command', id: 'ping' })

  expect(consoleError).toHaveBeenCalledWith(error)
  consoleError.mockRestore()
})
