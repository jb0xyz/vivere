import { ApplicationCommandOptionType } from 'discord.js'
import { expect, test, vi } from 'vitest'
import { DISCORD_OPTION_KIND } from './option-kinds.js'

test('maps option kinds to Discord command option types', () => {
  expect(DISCORD_OPTION_KIND.string.discordType).toBe(ApplicationCommandOptionType.String)
  expect(DISCORD_OPTION_KIND.integer.discordType).toBe(ApplicationCommandOptionType.Integer)
  expect(DISCORD_OPTION_KIND.number.discordType).toBe(ApplicationCommandOptionType.Number)
  expect(DISCORD_OPTION_KIND.boolean.discordType).toBe(ApplicationCommandOptionType.Boolean)
  expect(DISCORD_OPTION_KIND.user.discordType).toBe(ApplicationCommandOptionType.User)
  expect(DISCORD_OPTION_KIND.role.discordType).toBe(ApplicationCommandOptionType.Role)
  expect(DISCORD_OPTION_KIND.attachment.discordType).toBe(ApplicationCommandOptionType.Attachment)
})

test('reads option values through the configured getter', () => {
  const options = {
    getString: vi.fn(() => 'hello'),
    getInteger: vi.fn(() => 1),
    getNumber: vi.fn(() => 1.5),
    getBoolean: vi.fn(() => true),
    getUser: vi.fn(() => ({ id: 'user' })),
    getRole: vi.fn(() => ({ id: 'role' })),
    getAttachment: vi.fn(() => ({ id: 'attachment' })),
  }

  expect(DISCORD_OPTION_KIND.string.get(options, 'note', true)).toBe('hello')
  expect(DISCORD_OPTION_KIND.integer.get(options, 'count', true)).toBe(1)
  expect(DISCORD_OPTION_KIND.number.get(options, 'amount', true)).toBe(1.5)
  expect(DISCORD_OPTION_KIND.boolean.get(options, 'silent', false)).toBe(true)
  expect(DISCORD_OPTION_KIND.user.get(options, 'target', true)).toEqual({ id: 'user' })
  expect(DISCORD_OPTION_KIND.role.get(options, 'role', true)).toEqual({ id: 'role' })
  expect(DISCORD_OPTION_KIND.attachment.get(options, 'file', false)).toEqual({ id: 'attachment' })

  expect(options.getString).toHaveBeenCalledWith('note', true)
  expect(options.getBoolean).toHaveBeenCalledWith('silent', false)
})
