import { fileURLToPath } from 'node:url'
import { describe, expect, test } from 'vitest'
import { discoverButtons, discoverCommands, discoverEvents } from './discover.js'

const fixtureDir = fileURLToPath(new URL('__fixtures__', import.meta.url))

describe('discovery', () => {
  test('discovers command defaults recursively and skips reserved files', async () => {
    const commands = await discoverCommands(`${fixtureDir}/valid/commands`)

    expect(commands.map((command) => command.descriptor.name)).toEqual(['ask', 'ping'])
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

  test('throws when command name does not match file basename', async () => {
    await expect(discoverCommands(`${fixtureDir}/commands/bad-name`)).rejects.toThrow(
      'Command name "different-name" must match file name "wrong-file"',
    )
  })

  test('throws when command names are duplicated', async () => {
    await expect(discoverCommands(`${fixtureDir}/commands/duplicates`)).rejects.toThrow(
      'Duplicate command name "ping"',
    )
  })

  test('throws when button ids are duplicated', async () => {
    await expect(discoverButtons(`${fixtureDir}/buttons/duplicates`)).rejects.toThrow(
      'Duplicate button id "confirm"',
    )
  })
})
