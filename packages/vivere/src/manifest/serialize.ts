import type { ApplicationCommandDescriptor, CommandDescriptor, CommandLocalizations } from '../authoring/ir.js'

export type SerializedOption = CommandDescriptor['options'][number]
export type SerializedCommand = ApplicationCommandDescriptor

function serializeLocalizations(localizations: CommandLocalizations | undefined): CommandLocalizations | undefined {
  if (!localizations) return undefined

  return Object.fromEntries(
    Object.entries(localizations)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([locale, value]) => [
        locale,
        {
          ...(value.name === undefined ? {} : { name: value.name }),
          ...(value.description === undefined ? {} : { description: value.description }),
        },
      ]),
  )
}

export function serializeCommand(descriptor: ApplicationCommandDescriptor): SerializedCommand {
  const localizations = serializeLocalizations(descriptor.localizations)
  if (descriptor.kind !== 'command') {
    return {
      ...descriptor,
      ...(localizations ? { localizations } : {}),
    }
  }

  const options = descriptor.options
    .map((option) => ({ ...option }))
    .sort((a, b) => a.name.localeCompare(b.name))
  return {
    ...descriptor,
    route: [...descriptor.route],
    options,
    ...(localizations ? { localizations } : {}),
  }
}
