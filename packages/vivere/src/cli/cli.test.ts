import { expect, test, vi } from 'vitest'
import { parseCliArgs, runCli } from './cli.js'

test('parses build command flags', () => {
  expect(parseCliArgs(['build'])).toEqual({ kind: 'build', check: false })
  expect(parseCliArgs(['build', '--check'])).toEqual({ kind: 'build', check: true })
})

test('parses sync command flags', () => {
  expect(parseCliArgs(['sync'])).toEqual({ kind: 'sync', global: false })
  expect(parseCliArgs(['sync', '--global'])).toEqual({ kind: 'sync', global: true })
})

test('rejects empty or unknown commands', () => {
  expect(parseCliArgs([])).toEqual({ kind: 'usage', message: 'Usage: vivere <build|sync>' })
  expect(parseCliArgs(['unknown'])).toEqual({ kind: 'usage', message: 'Unknown command: unknown\nUsage: vivere <build|sync>' })
  expect(parseCliArgs(['build', '--bad'])).toEqual({
    kind: 'usage',
    message: 'Unknown option: --bad\nUsage: vivere <build|sync>',
  })
  expect(parseCliArgs(['sync', '--bad'])).toEqual({
    kind: 'usage',
    message: 'Unknown option: --bad\nUsage: vivere <build|sync>',
  })
})

test('dispatches build and maps check drift to exit code one', async () => {
  const runBuild = vi.fn(async () => ({ manifestPath: '.vivere/manifest.json', changed: true }))
  const writeOut = vi.fn()
  const writeErr = vi.fn()

  const exitCode = await runCli(['build', '--check'], {
    cwd: '/project',
    runBuild,
    writeOut,
    writeErr,
  })

  expect(exitCode).toBe(1)
  expect(runBuild).toHaveBeenCalledWith({ cwd: '/project', check: true })
  expect(writeErr).toHaveBeenCalledWith('Manifest is out of date: .vivere/manifest.json\n')
})

test('dispatches build success', async () => {
  const runBuild = vi.fn(async () => ({ manifestPath: '.vivere/manifest.json', changed: false }))
  const writeOut = vi.fn()
  const writeErr = vi.fn()

  const exitCode = await runCli(['build'], {
    cwd: '/project',
    runBuild,
    writeOut,
    writeErr,
  })

  expect(exitCode).toBe(0)
  expect(writeOut).toHaveBeenCalledWith('Manifest is up to date: .vivere/manifest.json\n')
})

test('dispatches sync success', async () => {
  const runSync = vi.fn(async () => ({ commandCount: 2, scope: 'guild' as const }))
  const writeOut = vi.fn()
  const writeErr = vi.fn()

  const exitCode = await runCli(['sync'], {
    cwd: '/project',
    runSync,
    writeOut,
    writeErr,
  })

  expect(exitCode).toBe(0)
  expect(runSync).toHaveBeenCalledWith({ cwd: '/project', global: false })
  expect(writeOut).toHaveBeenCalledWith('Synced 2 commands to guild\n')
})
