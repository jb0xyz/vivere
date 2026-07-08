import { ApplicationCommandType } from 'discord.js'
import type { APIApplicationCommandOption, RESTPostAPIApplicationCommandsJSONBody } from 'discord.js'
import { ApplicationCommandOptionType } from 'discord.js'
import type { ApplicationCommandDescriptor, CommandDescriptor, CommandLocalizations } from '../authoring/ir.js'
import { DISCORD_OPTION_KIND } from './option-kinds.js'

function getNameLocalizations(localizations: CommandLocalizations | undefined): Record<string, string> | undefined {
  const entries: Array<[string, string]> = []
  for (const [locale, value] of Object.entries(localizations ?? {})) {
    if (value.name !== undefined) entries.push([locale, value.name])
  }
  if (entries.length === 0) return undefined
  return Object.fromEntries(entries)
}

function getDescriptionLocalizations(localizations: CommandLocalizations | undefined): Record<string, string> | undefined {
  const entries: Array<[string, string]> = []
  for (const [locale, value] of Object.entries(localizations ?? {})) {
    if (value.description !== undefined) entries.push([locale, value.description])
  }
  if (entries.length === 0) return undefined
  return Object.fromEntries(entries)
}

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
    ...(getNameLocalizations(descriptor.localizations)
      ? { name_localizations: getNameLocalizations(descriptor.localizations) }
      : {}),
    ...(getDescriptionLocalizations(descriptor.localizations)
      ? { description_localizations: getDescriptionLocalizations(descriptor.localizations) }
      : {}),
  }
}

function createSubcommand(descriptor: CommandDescriptor): APIApplicationCommandOption {
  return {
    name: descriptor.name,
    description: descriptor.description,
    type: ApplicationCommandOptionType.Subcommand,
    options: serializeCommandOptions(descriptor),
    ...(getNameLocalizations(descriptor.localizations)
      ? { name_localizations: getNameLocalizations(descriptor.localizations) }
      : {}),
    ...(getDescriptionLocalizations(descriptor.localizations)
      ? { description_localizations: getDescriptionLocalizations(descriptor.localizations) }
      : {}),
  } as APIApplicationCommandOption
}

function compareRoute(a: CommandDescriptor, b: CommandDescriptor): number {
  return a.route.join('/').localeCompare(b.route.join('/'))
}

function toContextCommandJSON(descriptor: ApplicationCommandDescriptor): RESTPostAPIApplicationCommandsJSONBody {
  if (descriptor.kind === 'userCommand') {
    return {
      name: descriptor.name,
      type: ApplicationCommandType.User,
      ...(getNameLocalizations(descriptor.localizations)
        ? { name_localizations: getNameLocalizations(descriptor.localizations) }
        : {}),
    }
  }

  if (descriptor.kind === 'messageCommand') {
    return {
      name: descriptor.name,
      type: ApplicationCommandType.Message,
      ...(getNameLocalizations(descriptor.localizations)
        ? { name_localizations: getNameLocalizations(descriptor.localizations) }
        : {}),
    }
  }

  return toCommandJSON(descriptor)
}

export function buildCommandTree(descriptors: ApplicationCommandDescriptor[]): RESTPostAPIApplicationCommandsJSONBody[] {
  const slashDescriptorList = descriptors.filter((descriptor): descriptor is CommandDescriptor => descriptor.kind === 'command')
  const contextDescriptorList = descriptors
    .filter((descriptor) => descriptor.kind === 'userCommand' || descriptor.kind === 'messageCommand')
    .sort((a, b) => a.name.localeCompare(b.name) || a.kind.localeCompare(b.kind))
  const rootList = slashDescriptorList
    .filter((descriptor) => descriptor.route.length === 1)
    .sort(compareRoute)

  const slashCommandList = rootList.map((root) => {
    const childList = slashDescriptorList
      .filter((descriptor) => descriptor.route.length > 1 && descriptor.route[0] === root.route[0])
      .sort(compareRoute)

    if (childList.length === 0) return toCommandJSON(root)

    const subcommandList = childList
      .filter((descriptor) => descriptor.route.length === 2)
      .filter((descriptor) =>
        !slashDescriptorList.some((candidate) =>
          candidate.route.length === 3 &&
          candidate.route[0] === descriptor.route[0] &&
          candidate.route[1] === descriptor.route[1],
        ),
      )
      .map(createSubcommand)

    const groupList = childList
      .filter((descriptor) => descriptor.route.length === 2)
      .filter((descriptor) =>
        slashDescriptorList.some((candidate) =>
          candidate.route.length === 3 &&
          candidate.route[0] === descriptor.route[0] &&
          candidate.route[1] === descriptor.route[1],
        ),
      )
      .map((group): APIApplicationCommandOption => ({
        name: group.name,
        description: group.description,
        type: ApplicationCommandOptionType.SubcommandGroup,
        ...(getNameLocalizations(group.localizations)
          ? { name_localizations: getNameLocalizations(group.localizations) }
          : {}),
        ...(getDescriptionLocalizations(group.localizations)
          ? { description_localizations: getDescriptionLocalizations(group.localizations) }
          : {}),
        options: slashDescriptorList
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
      ...(getNameLocalizations(root.localizations) ? { name_localizations: getNameLocalizations(root.localizations) } : {}),
      ...(getDescriptionLocalizations(root.localizations)
        ? { description_localizations: getDescriptionLocalizations(root.localizations) }
        : {}),
    }
  })

  return [...slashCommandList, ...contextDescriptorList.map(toContextCommandJSON)]
}
