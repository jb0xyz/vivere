import { fileURLToPath } from 'node:url'
import { describe, expect, test } from 'vitest'
import type { CommandDefinition } from '../authoring/create-vivere.js'
import { discoverButtons, discoverCommands, discoverComponents, discoverEvents } from './discover.js'

const fixtureDir = fileURLToPath(new URL('__fixtures__', import.meta.url))

describe('discovery', () => {
  test('discovers command defaults recursively and skips reserved files', async () => {
    const commands = await discoverCommands(`${fixtureDir}/valid/commands`)

    expect(commands.map((command) => command.descriptor.name)).toEqual(['ask', 'ping'])
  })

  test('discovers command routes from folders and index metadata files', async () => {
    const commands = await discoverCommands(`${fixtureDir}/commands/routes`)
    const slashCommandList = commands.filter(
      (command): command is CommandDefinition => command.descriptor.kind === 'command',
    )

    expect(slashCommandList.map((command) => ({
      name: command.descriptor.name,
      description: command.descriptor.description,
      route: command.descriptor.route,
      hasExecute: typeof command.execute === 'function',
    }))).toEqual([
      { name: 'admin', description: 'Admin commands', route: ['admin'], hasExecute: false },
      { name: 'ban', description: 'Ban a user', route: ['admin', 'ban'], hasExecute: true },
      { name: 'user', description: 'User commands', route: ['admin', 'user'], hasExecute: false },
      { name: 'add', description: 'Add a user', route: ['admin', 'user', 'add'], hasExecute: true },
    ])
  })

  test('discovers context menu commands in command roots', async () => {
    const commands = await discoverCommands(`${fixtureDir}/commands/context`)

    expect(commands.map((command) => command.descriptor)).toEqual([
      { kind: 'messageCommand', name: 'Report Message' },
      { kind: 'userCommand', name: 'User Info' },
    ])
  })

  test('discovers event defaults and allows duplicate event names', async () => {
    const events = await discoverEvents(`${fixtureDir}/valid/events`)

    expect(events.map((event) => ({ name: event.descriptor.name, once: event.descriptor.once }))).toEqual([
      { name: 'ready', once: false },
      { name: 'ready', once: true },
    ])
  })

  test('discovers button defaults recursively', async () => {
    const buttons = await discoverButtons(`${fixtureDir}/valid/buttons`)

    expect(buttons.map((button) => button.descriptor.id)).toEqual(['confirm', 'cancel'])
  })

  test('discovers mixed component defaults recursively', async () => {
    const components = await discoverComponents(`${fixtureDir}/valid/components`)

    expect(components.map((component) => `${component.descriptor.componentKind}:${component.descriptor.id}`)).toEqual([
      'button:confirm',
      'modal:feedback',
      'select:pick-role',
    ])
  })

  test('throws when command name does not match file basename', async () => {
    await expect(discoverCommands(`${fixtureDir}/commands/bad-name`)).rejects.toThrow(
      'Command name "different-name" must match file name "wrong-file"',
    )
  })

  test('throws when command routes exceed Discord depth', async () => {
    await expect(discoverCommands(`${fixtureDir}/commands/deep`)).rejects.toThrow(
      'Command route "a/b/c/d" exceeds maximum depth 3',
    )
  })

  test('allows the same command leaf name in different routes', async () => {
    const commands = await discoverCommands(`${fixtureDir}/commands/duplicates`)
    const slashCommandList = commands.filter(
      (command): command is CommandDefinition => command.descriptor.kind === 'command',
    )

    expect(slashCommandList.map((command) => command.descriptor.route)).toEqual([
      ['a', 'ping'],
      ['b', 'ping'],
    ])
  })

  test('throws when component ids are duplicated within the same kind', async () => {
    await expect(discoverComponents(`${fixtureDir}/components/duplicates`)).rejects.toThrow(
      'Duplicate component id "button:confirm"',
    )
  })
})
