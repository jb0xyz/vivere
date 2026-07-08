import { expect, test } from 'vitest'
import { createVivere } from './create-vivere.js'

const { defineMessageCommand, defineUserCommand } = createVivere<{ mark(): void }>()

test('returns a user context command definition', () => {
  const command = defineUserCommand({
    name: 'User Info',
    async execute() {},
  })

  expect(command.descriptor).toEqual({
    kind: 'userCommand',
    name: 'User Info',
  })
})

test('returns a message context command definition', () => {
  const command = defineMessageCommand({
    name: 'Report',
    async execute() {},
  })

  expect(command.descriptor).toEqual({
    kind: 'messageCommand',
    name: 'Report',
  })
})
