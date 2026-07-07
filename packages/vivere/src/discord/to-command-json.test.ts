import { ApplicationCommandOptionType, ApplicationCommandType } from 'discord.js'
import { expect, test } from 'vitest'
import { createVivere } from '../authoring/create-vivere.js'
import { toCommandJSON } from './to-command-json.js'

const { defineCommand, opt } = createVivere()

test('maps options to Discord types and lists required ones first', () => {
  const cmd = defineCommand({
    name: 'assign-role',
    description: 'assign',
    options: {
      silent: opt.boolean('quiet').optional(),
      targetUser: opt.user('member'),
    },
    async execute() {},
  })

  const json = toCommandJSON(cmd.descriptor)

  expect(json.name).toBe('assign-role')
  expect(json.type).toBe(ApplicationCommandType.ChatInput)
  expect(json.options).toEqual([
    {
      name: 'target-user',
      description: 'member',
      type: ApplicationCommandOptionType.User,
      required: true,
    },
    {
      name: 'silent',
      description: 'quiet',
      type: ApplicationCommandOptionType.Boolean,
      required: false,
    },
  ])
})
