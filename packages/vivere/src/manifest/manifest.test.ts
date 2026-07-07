import { expect, test } from 'vitest'
import { createVivere } from '../authoring/create-vivere.js'
import { buildManifest, manifestToJson } from './manifest.js'

const { defineButton, defineCommand, defineEvent, opt, param } = createVivere()

test('builds deterministic manifests without function fields', () => {
  const askCommand = defineCommand({
    name: 'ask',
    description: 'Ask',
    options: { targetUser: opt.user('target') },
    async execute() {},
  })
  const pingCommand = defineCommand({
    name: 'ping',
    description: 'Pong',
    async execute() {},
  })
  const readyEvent = defineEvent({ name: 'ready', once: true, async execute() {} })
  const joinEvent = defineEvent({ name: 'guildMemberAdd', async execute() {} })
  const confirmButton = defineButton({
    id: 'confirm',
    params: { userId: param.snowflake(), mode: param.enum(['yes', 'no'] as const) },
    async execute() {},
  })
  const cancelButton = defineButton({ id: 'cancel', async execute() {} })

  const manifest = buildManifest({
    commands: [pingCommand.descriptor, askCommand.descriptor],
    events: [readyEvent.descriptor, joinEvent.descriptor],
    buttons: [confirmButton.descriptor, cancelButton.descriptor],
  })
  const json = manifestToJson(manifest)

  expect(manifest).toEqual({
    schemaVersion: 1,
    commands: [
      {
        kind: 'command',
        name: 'ask',
        description: 'Ask',
        route: ['ask'],
        options: [{ property: 'targetUser', name: 'target-user', kind: 'user', description: 'target', required: true }],
      },
      { kind: 'command', name: 'ping', description: 'Pong', route: ['ping'], options: [] },
    ],
    events: [
      { kind: 'event', name: 'guildMemberAdd', once: false },
      { kind: 'event', name: 'ready', once: true },
    ],
    buttons: [
      { kind: 'button', componentKind: 'button', id: 'cancel', params: [] },
      {
        kind: 'button',
        componentKind: 'button',
        id: 'confirm',
        params: [
          { name: 'mode', kind: 'enum', values: ['yes', 'no'] },
          { name: 'userId', kind: 'snowflake' },
        ],
      },
    ],
  })
  expect(
    manifestToJson(
      buildManifest({
        commands: [askCommand.descriptor, pingCommand.descriptor],
        events: [joinEvent.descriptor, readyEvent.descriptor],
        buttons: [cancelButton.descriptor, confirmButton.descriptor],
      }),
    ),
  ).toBe(json)
  expect(json).not.toContain('execute')
})
