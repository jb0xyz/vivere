import type { ApplicationCommandDescriptor, CommandDescriptor } from '../authoring/ir.js'

export type SerializedOption = CommandDescriptor['options'][number]
export type SerializedCommand = ApplicationCommandDescriptor

export function serializeCommand(descriptor: ApplicationCommandDescriptor): SerializedCommand {
  if (descriptor.kind !== 'command') return { ...descriptor }

  const options = descriptor.options
    .map((option) => ({ ...option }))
    .sort((a, b) => a.name.localeCompare(b.name))
  return { ...descriptor, route: [...descriptor.route], options }
}
