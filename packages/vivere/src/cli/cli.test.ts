import { expect, test, vi } from 'vitest'
import { parseCliArgs, runCli } from './cli.js'

test('parses build command flags', () => {
  expect(parseCliArgs(['build'])).toEqual({ kind: 'build', check: false })
  expect(parseCliArgs(['build', '--check'])).toEqual({ kind: 'build', check: true })
})

test('rejects empty or unknown commands', () => {
  expect(parseCliArgs([])).toEqual({ kind: 'usage', message: 'Usage: vivere build [--check]' })
  expect(parseCliArgs(['sync'])).toEqual({ kind: 'usage', message: 'Unknown command: sync\nUsage: vivere build [--check]' })
  expect(parseCliArgs(['build', '--bad'])).toEqual({
    kind: 'usage',
    message: 'Unknown option: --bad\nUsage: vivere build [--check]',
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
