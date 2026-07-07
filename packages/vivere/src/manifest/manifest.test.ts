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
    commands: [pingCommand, askCommand],
    events: [readyEvent, joinEvent],
    buttons: [confirmButton, cancelButton],
  })
  const json = manifestToJson(manifest)

  expect(manifest).toEqual({
    schemaVersion: 1,
    commands: [
      {
        kind: 'command',
        name: 'ask',
        options: [{ name: 'target-user', kind: 'user', required: true }],
      },
      { kind: 'command', name: 'ping', options: [] },
    ],
    events: [
      { name: 'guildMemberAdd', once: false },
      { name: 'ready', once: true },
    ],
    buttons: [
      { id: 'cancel', params: [] },
      {
        id: 'confirm',
        params: [
          { name: 'mode', kind: 'enum' },
          { name: 'userId', kind: 'snowflake' },
        ],
      },
    ],
  })
  expect(manifestToJson(buildManifest({ commands: [askCommand, pingCommand], events: [joinEvent, readyEvent], buttons: [cancelButton, confirmButton] }))).toBe(json)
  expect(json).not.toContain('execute')
})
