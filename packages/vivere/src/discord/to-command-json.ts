import { ApplicationCommandOptionType, ApplicationCommandType } from 'discord.js'
import type { CommandIR } from '../authoring/create-vivere.js'
import { toDiscordName } from '../manifest/serialize.js'

const OPTION_TYPE: Record<string, ApplicationCommandOptionType> = {
  string: ApplicationCommandOptionType.String,
  integer: ApplicationCommandOptionType.Integer,
  number: ApplicationCommandOptionType.Number,
  boolean: ApplicationCommandOptionType.Boolean,
  user: ApplicationCommandOptionType.User,
  member: ApplicationCommandOptionType.User,
  role: ApplicationCommandOptionType.Role,
  attachment: ApplicationCommandOptionType.Attachment,
}

export function toCommandJSON(ir: CommandIR) {
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
