import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, test, vi } from 'vitest'
import { createVivere } from '../authoring/create-vivere.js'
import { createAppErrorReporter, resolveDefinitions } from './create-app.js'

const fixtureDir = fileURLToPath(new URL('../discovery/__fixtures__', import.meta.url))
const { defineButton, defineCommand, defineEvent } = createVivere()

describe('resolveDefinitions', () => {
  test('returns explicit definitions without discovery', async () => {
    const command = defineCommand({ name: 'ping', description: 'Pong', async execute() {} })
    const event = defineEvent({ name: 'ready', async execute() {} })
    const button = defineButton({ id: 'confirm', async execute() {} })

    const definitions = await resolveDefinitions({
      cwd: fixtureDir,
      commands: [command],
      events: [event],
      buttons: [button],
    })

    expect(definitions.commands.map((item) => item.descriptor.name)).toEqual(['ping'])
    expect(definitions.events.map((item) => item.descriptor.name)).toEqual(['ready'])
    expect(definitions.buttons.map((item) => item.descriptor.id)).toEqual(['confirm'])
  })

  test('discovers definitions from configured roots', async () => {
    const definitions = await resolveDefinitions({
      cwd: fixtureDir,
      discover: {
        commands: 'valid/commands',
        events: 'valid/events',
        components: 'valid/buttons',
      },
    })

    expect(definitions.commands.map((item) => item.descriptor.name)).toEqual(['ask', 'ping'])
    expect(definitions.events.map((item) => item.descriptor.name)).toEqual(['ready', 'ready'])
    expect(definitions.buttons.map((item) => item.descriptor.id)).toEqual(['confirm', 'cancel'])
  })

  test('combines explicit and discovered definitions', async () => {
    const explicitCommand = defineCommand({ name: 'help', description: 'Help', async execute() {} })
    const explicitButton = defineButton({ id: 'help', async execute() {} })

    const definitions = await resolveDefinitions({
      cwd: fixtureDir,
      commands: [explicitCommand],
      buttons: [explicitButton],
      discover: {
        commands: 'valid/commands',
        components: 'valid/buttons',
      },
    })

    expect(definitions.commands.map((item) => item.descriptor.name)).toEqual(['help', 'ask', 'ping'])
    expect(definitions.buttons.map((item) => item.descriptor.id)).toEqual(['help', 'confirm', 'cancel'])
  })

  test('throws on combined command or component duplicates', async () => {
    const duplicateCommand = defineCommand({ name: 'ping', description: 'Pong', async execute() {} })
    const duplicateButton = defineButton({ id: 'confirm', async execute() {} })

    await expect(
      resolveDefinitions({
        cwd: fixtureDir,
        commands: [duplicateCommand],
        discover: { commands: 'valid/commands' },
      }),
    ).rejects.toThrow('Duplicate command key "command:ping"')
    await expect(
      resolveDefinitions({
        cwd: fixtureDir,
        buttons: [duplicateButton],
        discover: { components: 'valid/buttons' },
      }),
    ).rejects.toThrow('Duplicate component id "button:confirm"')
  })

  test('passes importer through to discovery', async () => {
    const importedPathList: string[] = []
    const definitions = await resolveDefinitions(
      {
        cwd: fixtureDir,
        discover: { commands: 'valid/commands' },
      },
      async (absPath) => {
        importedPathList.push(absPath)
        return import(absPath)
      },
    )

    expect(definitions.commands.map((item) => item.descriptor.name)).toEqual(['ask', 'ping'])
    expect(importedPathList.every((item) => item.startsWith(resolve(fixtureDir)))).toBe(true)
  })
})

test('uses app-level onError when provided', () => {
  const onError = vi.fn()
  const error = new Error('failed')
  const reportError = createAppErrorReporter({ onError })

  reportError(error, { phase: 'command', id: 'ping' })

  expect(onError).toHaveBeenCalledWith(error, { phase: 'command', id: 'ping' })
})

test('uses the default console reporter when onError is not provided', () => {
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
  const error = new Error('failed')
  const reportError = createAppErrorReporter({})

  reportError(error, { phase: 'event', id: 'ready' })

  expect(consoleError).toHaveBeenCalledWith(error)
  consoleError.mockRestore()
})
