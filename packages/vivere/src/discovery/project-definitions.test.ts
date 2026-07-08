import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, test } from 'vitest'
import { createVivere } from '../authoring/create-vivere.js'
import { resolveProjectDefinitions } from './project-definitions.js'

const fixtureDir = fileURLToPath(new URL('__fixtures__', import.meta.url))
const { defineButton, defineCommand, defineEvent, definePlugin } = createVivere()

describe('resolveProjectDefinitions', () => {
  test('combines explicit definitions with discovered project definitions', async () => {
    const explicitCommand = defineCommand({ name: 'help', description: 'Help', async execute() {} })
    const explicitEvent = defineEvent({ name: 'ready', async execute() {} })
    const explicitButton = defineButton({ id: 'help', async execute() {} })
    const pluginCommand = defineCommand({ name: 'plugin-help', description: 'Plugin help', async execute() {} })
    const pluginEvent = defineEvent({ name: 'ready', async execute() {} })
    const pluginButton = defineButton({ id: 'plugin-help', async execute() {} })
    const plugin = definePlugin({
      name: 'support',
      commands: [pluginCommand],
      events: [pluginEvent],
      components: [pluginButton],
    })

    const definitions = await resolveProjectDefinitions({
      baseDir: fixtureDir,
      discovery: {
        commands: 'valid/commands',
        events: 'valid/events',
        components: 'valid/buttons',
      },
      explicit: {
        commands: [explicitCommand],
        events: [explicitEvent],
        buttons: [explicitButton],
      },
      plugins: [plugin],
    })

    expect(definitions.commands.map((item) => item.descriptor.name)).toEqual(['help', 'ask', 'ping', 'plugin-help'])
    expect(definitions.events.map((item) => item.descriptor.name)).toEqual(['ready', 'ready', 'ready', 'ready'])
    expect(definitions.buttons.map((item) => item.descriptor.id)).toEqual(['help', 'confirm', 'cancel', 'plugin-help'])
  })

  test('uses the supplied importer for discovered files', async () => {
    const importedPathList: string[] = []

    await resolveProjectDefinitions({
      baseDir: fixtureDir,
      discovery: { commands: 'valid/commands' },
      importer: async (absPath) => {
        importedPathList.push(absPath)
        return import(absPath)
      },
    })

    expect(importedPathList.every((item) => item.startsWith(resolve(fixtureDir)))).toBe(true)
  })

  test('throws on combined command and component duplicates', async () => {
    const duplicateCommand = defineCommand({ name: 'ping', description: 'Pong', async execute() {} })
    const duplicateButton = defineButton({ id: 'confirm', async execute() {} })

    await expect(
      resolveProjectDefinitions({
        baseDir: fixtureDir,
        discovery: { commands: 'valid/commands' },
        explicit: { commands: [duplicateCommand] },
      }),
    ).rejects.toThrow('Duplicate command name "ping"')
    await expect(
      resolveProjectDefinitions({
        baseDir: fixtureDir,
        discovery: { components: 'valid/buttons' },
        explicit: { buttons: [duplicateButton] },
      }),
    ).rejects.toThrow('Duplicate component id "button:confirm"')
    await expect(
      resolveProjectDefinitions({
        baseDir: fixtureDir,
        discovery: { commands: 'valid/commands' },
        plugins: [definePlugin({ name: 'duplicate', commands: [duplicateCommand] })],
      }),
    ).rejects.toThrow('Duplicate command name "ping"')
  })
})
