import type { CommandDescriptor } from '../authoring/ir.js'

export type SerializedOption = CommandDescriptor['options'][number]
export type SerializedCommand = CommandDescriptor

export function serializeCommand(descriptor: CommandDescriptor): SerializedCommand {
  const options = descriptor.options
    .map((option) => ({ ...option }))
    .sort((a, b) => a.name.localeCompare(b.name))
  return { ...descriptor, route: [...descriptor.route], options }
}
