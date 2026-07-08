import { expect, test } from 'vitest'
import { getInitialProjectName, getPackageManager, validateProjectName } from './cli.js'

test('reads the first positional argument as the project name', () => {
  expect(getInitialProjectName(['my-bot'])).toBe('my-bot')
  expect(getInitialProjectName(['--flag', 'my-bot'])).toBe('my-bot')
  expect(getInitialProjectName(['--flag'])).toBeUndefined()
})

test('validates project names before writing files', () => {
  expect(validateProjectName('my-bot')).toBeUndefined()
  expect(validateProjectName('')).toBe('Enter a project name.')
  expect(validateProjectName('   ')).toBe('Enter a project name.')
})

test('detects the invoking package manager from npm user agent', () => {
  expect(getPackageManager('pnpm/9.15.9 npm/? node/?')).toBe('pnpm')
  expect(getPackageManager('yarn/1.22.22 npm/? node/?')).toBe('yarn')
  expect(getPackageManager('bun/1.2.0 npm/? node/?')).toBe('bun')
  expect(getPackageManager('')).toBe('npm')
})
