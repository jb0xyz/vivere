import type { DeferInput, ReplyInput } from '../authoring/types.js'
import type { OptionKind } from '../authoring/opt.js'

/** Narrow boundary the router depends on — NOT the whole discord.js interaction. */
export interface ChatInputInteractionAdapter {
  readonly commandName: string
  getOption(name: string, kind: OptionKind, required: boolean): unknown
  reply(input: ReplyInput): Promise<void>
  deferReply(input?: DeferInput): Promise<void>
}
