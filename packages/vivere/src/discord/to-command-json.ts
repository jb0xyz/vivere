import { ApplicationCommandType } from 'discord.js'
import type { APIApplicationCommandOption, RESTPostAPIApplicationCommandsJSONBody } from 'discord.js'
import { ApplicationCommandOptionType } from 'discord.js'
import type { CommandDescriptor } from '../authoring/ir.js'
import { DISCORD_OPTION_KIND } from './option-kinds.js'

function serializeCommandOptions(descriptor: CommandDescriptor): APIApplicationCommandOption[] {
  return descriptor.options
    .map((option): APIApplicationCommandOption => ({
      name: option.name,
      description: option.description,
      type: DISCORD_OPTION_KIND[option.kind].discordType,
      required: option.required,
      ...(option.autocomplete ? { autocomplete: true } : {}),
    }) as APIApplicationCommandOption)
    .sort((a, b) => Number(b.required) - Number(a.required))
}

export function toCommandJSON(descriptor: CommandDescriptor): RESTPostAPIApplicationCommandsJSONBody {
  return {
    name: descriptor.name,
    description: descriptor.description,
    type: ApplicationCommandType.ChatInput,
    options: serializeCommandOptions(descriptor),
  }
}

function createSubcommand(descriptor: CommandDescriptor): APIApplicationCommandOption {
  return {
    name: descriptor.name,
    description: descriptor.description,
    type: ApplicationCommandOptionType.Subcommand,
    options: serializeCommandOptions(descriptor),
  } as APIApplicationCommandOption
}

function compareRoute(a: CommandDescriptor, b: CommandDescriptor): number {
  return a.route.join('/').localeCompare(b.route.join('/'))
}

export function buildCommandTree(descriptors: CommandDescriptor[]): RESTPostAPIApplicationCommandsJSONBody[] {
  const rootList = descriptors
    .filter((descriptor) => descriptor.route.length === 1)
    .sort(compareRoute)

  return rootList.map((root) => {
    const childList = descriptors
      .filter((descriptor) => descriptor.route.length > 1 && descriptor.route[0] === root.route[0])
      .sort(compareRoute)

    if (childList.length === 0) return toCommandJSON(root)

    const subcommandList = childList
      .filter((descriptor) => descriptor.route.length === 2)
      .filter((descriptor) =>
        !descriptors.some((candidate) =>
          candidate.route.length === 3 &&
          candidate.route[0] === descriptor.route[0] &&
          candidate.route[1] === descriptor.route[1],
        ),
      )
      .map(createSubcommand)

    const groupList = childList
      .filter((descriptor) => descriptor.route.length === 2)
      .filter((descriptor) =>
        descriptors.some((candidate) =>
          candidate.route.length === 3 &&
          candidate.route[0] === descriptor.route[0] &&
          candidate.route[1] === descriptor.route[1],
        ),
      )
      .map((group): APIApplicationCommandOption => ({
        name: group.name,
        description: group.description,
        type: ApplicationCommandOptionType.SubcommandGroup,
        options: descriptors
          .filter((descriptor) =>
            descriptor.route.length === 3 &&
            descriptor.route[0] === group.route[0] &&
            descriptor.route[1] === group.route[1],
          )
          .sort(compareRoute)
          .map(createSubcommand),
      }) as APIApplicationCommandOption)

    return {
      name: root.name,
      description: root.description,
      type: ApplicationCommandType.ChatInput,
      options: [...subcommandList, ...groupList],
    }
  })
}
