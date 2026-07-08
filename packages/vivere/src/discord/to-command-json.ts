import { ApplicationCommandType } from 'discord.js'
import type { APIApplicationCommandOption, RESTPostAPIApplicationCommandsJSONBody } from 'discord.js'
import type { CommandDescriptor } from '../authoring/ir.js'
import { DISCORD_OPTION_KIND } from './option-kinds.js'

export function toCommandJSON(descriptor: CommandDescriptor): RESTPostAPIApplicationCommandsJSONBody {
  const options = descriptor.options
    .map((option): APIApplicationCommandOption => ({
      name: option.name,
      description: option.description,
      type: DISCORD_OPTION_KIND[option.kind].discordType,
      required: option.required,
    }) as APIApplicationCommandOption)
    .sort((a, b) => Number(b.required) - Number(a.required))

  return {
    name: descriptor.name,
    description: descriptor.description,
    type: ApplicationCommandType.ChatInput,
    options,
  }
}
