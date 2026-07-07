import type { DeferInput, ReplyInput } from '../authoring/types.js'
import type { OptionKind } from '../authoring/opt.js'

/** Narrow boundary the router depends on — NOT the whole discord.js interaction. */
export interface ChatInputInteractionAdapter {
  readonly commandName: string
  getOption(name: string, kind: OptionKind, required: boolean): unknown
  reply(input: ReplyInput): Promise<void>
  deferReply(input?: DeferInput): Promise<void>
}

export interface ButtonInteractionAdapter {
  readonly customId: string
  update(input: ReplyInput): Promise<void>
  reply(input: ReplyInput): Promise<void>
  deferUpdate(): Promise<void>
}
