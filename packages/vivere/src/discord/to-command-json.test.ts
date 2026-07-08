import { ApplicationCommandOptionType, ApplicationCommandType } from 'discord.js'
import { expect, test } from 'vitest'
import { createVivere } from '../authoring/create-vivere.js'
import { buildCommandTree, toCommandJSON } from './to-command-json.js'

const { defineCommand, opt } = createVivere()

test('maps options to Discord types and lists required ones first', () => {
  const cmd = defineCommand({
    name: 'assign-role',
    description: 'assign',
    options: {
      silent: opt.boolean('quiet').optional(),
      search: opt.string('search').autocomplete(async () => []),
      targetUser: opt.user('member'),
    },
    async execute() {},
  })

  const json = toCommandJSON(cmd.descriptor)

  expect(json.name).toBe('assign-role')
  expect(json.type).toBe(ApplicationCommandType.ChatInput)
  expect(json.options).toEqual([
    {
      name: 'search',
      description: 'search',
      type: ApplicationCommandOptionType.String,
      required: true,
      autocomplete: true,
    },
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

test('builds nested Discord command JSON from command routes', () => {
  const admin = defineCommand({ name: 'admin', description: 'Admin commands' })
  const user = defineCommand({ name: 'user', description: 'User commands' })
  const ban = defineCommand({
    name: 'ban',
    description: 'Ban a user',
    options: { targetUser: opt.user('Target user') },
    async execute() {},
  })
  const add = defineCommand({ name: 'add', description: 'Add a user', async execute() {} })

  const json = buildCommandTree([
    { ...admin.descriptor, route: ['admin'] },
    { ...ban.descriptor, route: ['admin', 'ban'] },
    { ...user.descriptor, route: ['admin', 'user'] },
    { ...add.descriptor, route: ['admin', 'user', 'add'] },
  ])

  expect(json).toEqual([
    {
      name: 'admin',
      description: 'Admin commands',
      type: ApplicationCommandType.ChatInput,
      options: [
        {
          name: 'ban',
          description: 'Ban a user',
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            {
              name: 'target-user',
              description: 'Target user',
              type: ApplicationCommandOptionType.User,
              required: true,
            },
          ],
        },
        {
          name: 'user',
          description: 'User commands',
          type: ApplicationCommandOptionType.SubcommandGroup,
          options: [
            {
              name: 'add',
              description: 'Add a user',
              type: ApplicationCommandOptionType.Subcommand,
              options: [],
            },
          ],
        },
      ],
    },
  ])
})
