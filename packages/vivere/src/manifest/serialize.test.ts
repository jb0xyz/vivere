import { expect, test } from 'vitest'
import { createVivere } from '../authoring/create-vivere.js'
import { serializeCommand } from './serialize.js'

const { defineCommand, opt } = createVivere()

test('serializes IR without functions, deterministically', () => {
  const cmd = defineCommand({
    name: 'assign-role',
    description: 'assign',
    options: { targetUser: opt.user('t'), silent: opt.boolean('s').optional() },
    async execute() {},
  })
  const a = serializeCommand(cmd.descriptor)
  const b = serializeCommand(cmd.descriptor)
  expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  expect(a).toEqual({
    kind: 'command',
    name: 'assign-role',
    description: 'assign',
    route: ['assign-role'],
    options: [
      { property: 'silent', name: 'silent', kind: 'boolean', description: 's', required: false },
      { property: 'targetUser', name: 'target-user', kind: 'user', description: 't', required: true },
    ],
  })
  expect(JSON.stringify(a)).not.toContain('execute')
})
