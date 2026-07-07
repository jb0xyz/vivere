import { ApplicationCommandOptionType } from 'discord.js'
import type { OptionKind } from '../authoring/opt.js'

export interface DiscordOptionResolver {
  getString(name: string, required: boolean): string | null
  getInteger(name: string, required: boolean): number | null
  getNumber(name: string, required: boolean): number | null
  getBoolean(name: string, required: boolean): boolean | null
  getUser(name: string, required: boolean): unknown
  getRole(name: string, required: boolean): unknown
  getAttachment(name: string, required: boolean): unknown
}

export interface DiscordOptionKindEntry {
  discordType: ApplicationCommandOptionType
  get(options: DiscordOptionResolver, name: string, required: boolean): unknown
}

export const DISCORD_OPTION_KIND = {
  string: {
    discordType: ApplicationCommandOptionType.String,
    get: (options, name, required) => options.getString(name, required) ?? undefined,
  },
  integer: {
    discordType: ApplicationCommandOptionType.Integer,
    get: (options, name, required) => options.getInteger(name, required) ?? undefined,
  },
  number: {
    discordType: ApplicationCommandOptionType.Number,
    get: (options, name, required) => options.getNumber(name, required) ?? undefined,
  },
  boolean: {
    discordType: ApplicationCommandOptionType.Boolean,
    get: (options, name, required) => options.getBoolean(name, required) ?? undefined,
  },
  user: {
    discordType: ApplicationCommandOptionType.User,
    get: (options, name, required) => options.getUser(name, required) ?? undefined,
  },
  role: {
    discordType: ApplicationCommandOptionType.Role,
    get: (options, name, required) => options.getRole(name, required) ?? undefined,
  },
  attachment: {
    discordType: ApplicationCommandOptionType.Attachment,
    get: (options, name, required) => options.getAttachment(name, required) ?? undefined,
  },
} satisfies Record<OptionKind, DiscordOptionKindEntry>
