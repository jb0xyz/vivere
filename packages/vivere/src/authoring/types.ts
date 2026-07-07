import type { Client } from 'discord.js'

export type ReplyInput = string | { content: string; ephemeral?: boolean }
export type DeferInput = { ephemeral?: boolean }

export interface CommandContext<TOptions, TServices> {
  options: TOptions
  services: TServices
  reply(input: ReplyInput): Promise<void>
  defer(input?: DeferInput): Promise<void>
}

export interface EventContext<TServices> {
  services: TServices
  client: Client
}
