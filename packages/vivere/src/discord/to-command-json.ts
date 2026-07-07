import { ApplicationCommandType } from 'discord.js'
import type { CommandIR } from '../authoring/create-vivere.js'

export function toCommandJSON(ir: CommandIR) {
  return {
    name: ir.name,
    description: ir.description,
    type: ApplicationCommandType.ChatInput,
  }
}
