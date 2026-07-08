import { expect, test } from 'vitest'
import { createVivere } from '../authoring/create-vivere.js'
import { buildManifest, manifestToJson } from './manifest.js'

const { defineButton, defineCommand, defineEvent, defineModal, defineSelect, field, opt, param } = createVivere()

test('builds deterministic manifests without function fields', () => {
  const askCommand = defineCommand({
    name: 'ask',
    description: 'Ask',
    options: {
      targetUser: opt.user('target'),
      query: opt.string('query').autocomplete(async () => []),
    },
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
  const pickRoleSelect = defineSelect({
    id: 'pick-role',
    params: { userId: param.snowflake() },
    async execute() {},
  })
  const feedbackModal = defineModal({
    id: 'feedback',
    params: { userId: param.snowflake() },
    fields: {
      subject: field.short('Subject', { required: true, maxLength: 100 }),
      body: field.paragraph('Details'),
    },
    async execute() {},
  })

  const manifest = buildManifest({
    commands: [pingCommand.descriptor, askCommand.descriptor],
    events: [readyEvent.descriptor, joinEvent.descriptor],
    components: [confirmButton.descriptor, cancelButton.descriptor, pickRoleSelect.descriptor, feedbackModal.descriptor],
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
        options: [
          {
            property: 'query',
            name: 'query',
            kind: 'string',
            description: 'query',
            required: true,
            autocomplete: true,
          },
          {
            property: 'targetUser',
            name: 'target-user',
            kind: 'user',
            description: 'target',
            required: true,
          },
        ],
      },
      { kind: 'command', name: 'ping', description: 'Pong', route: ['ping'], options: [] },
    ],
    events: [
      { kind: 'event', name: 'guildMemberAdd', once: false },
      { kind: 'event', name: 'ready', once: true },
    ],
    components: [
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
      {
        kind: 'modal',
        componentKind: 'modal',
        id: 'feedback',
        params: [{ name: 'userId', kind: 'snowflake' }],
        fields: [
          { name: 'subject', style: 'short', label: 'Subject', required: true, maxLength: 100 },
          { name: 'body', style: 'paragraph', label: 'Details', required: false },
        ],
      },
      { kind: 'select', componentKind: 'select', id: 'pick-role', params: [{ name: 'userId', kind: 'snowflake' }] },
    ],
  })
  expect(
    manifestToJson(
      buildManifest({
        commands: [askCommand.descriptor, pingCommand.descriptor],
        events: [joinEvent.descriptor, readyEvent.descriptor],
        components: [pickRoleSelect.descriptor, cancelButton.descriptor, feedbackModal.descriptor, confirmButton.descriptor],
      }),
    ),
  ).toBe(json)
  expect(json).not.toContain('execute')
})
