import { ApplicationCommandOptionType, ApplicationCommandType } from 'discord.js'
import type { CommandDescriptor } from '../authoring/ir.js'
import type { OptionKind } from '../authoring/opt.js'

const OPTION_TYPE = {
  string: ApplicationCommandOptionType.String,
  integer: ApplicationCommandOptionType.Integer,
  number: ApplicationCommandOptionType.Number,
  boolean: ApplicationCommandOptionType.Boolean,
  user: ApplicationCommandOptionType.User,
  role: ApplicationCommandOptionType.Role,
  attachment: ApplicationCommandOptionType.Attachment,
} satisfies Record<OptionKind, ApplicationCommandOptionType>

export function toCommandJSON(descriptor: CommandDescriptor) {
  const options = descriptor.options
    .map((option) => ({
      name: option.name,
      description: option.description,
      type: OPTION_TYPE[option.kind],
      required: option.required,
    }))
    .sort((a, b) => Number(b.required) - Number(a.required))

  return {
    name: descriptor.name,
    description: descriptor.description,
    type: ApplicationCommandType.ChatInput,
    options,
  }
}
