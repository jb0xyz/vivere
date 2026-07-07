import type { DeferInput, ReplyInput } from '../authoring/types.js'

/** Narrow boundary the router depends on — NOT the whole discord.js interaction. */
export interface ChatInputInteractionAdapter {
  readonly commandName: string
  reply(input: ReplyInput): Promise<void>
  deferReply(input?: DeferInput): Promise<void>
}
