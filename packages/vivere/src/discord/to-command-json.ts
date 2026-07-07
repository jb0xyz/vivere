import { ApplicationCommandOptionType, ApplicationCommandType } from 'discord.js'
import type { CommandIR } from '../authoring/create-vivere.js'
import type { OptionKind } from '../authoring/opt.js'
import { toDiscordName } from '../manifest/serialize.js'

const OPTION_TYPE = {
  string: ApplicationCommandOptionType.String,
  integer: ApplicationCommandOptionType.Integer,
  number: ApplicationCommandOptionType.Number,
  boolean: ApplicationCommandOptionType.Boolean,
  user: ApplicationCommandOptionType.User,
  role: ApplicationCommandOptionType.Role,
  attachment: ApplicationCommandOptionType.Attachment,
} satisfies Record<OptionKind, ApplicationCommandOptionType>

export function toCommandJSON<TServices>(ir: CommandIR<TServices>) {
  const options = Object.entries(ir.options)
    .map(([key, node]) => ({
      name: toDiscordName(key),
      description: node.description,
      type: OPTION_TYPE[node.kind],
      required: node.presence === 'required',
    }))
    // Discord requires every required option to be listed before optional ones.
    .sort((a, b) => Number(b.required) - Number(a.required))

  return {
    name: ir.name,
    description: ir.description,
    type: ApplicationCommandType.ChatInput,
    options,
  }
}
