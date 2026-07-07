import type { ActionRowBuilder, ButtonBuilder, Client } from 'discord.js'
import type { ButtonIR } from './create-vivere.js'
import type { InferParams, ParamsRecord } from './param.js'

export type ButtonStyleName = 'primary' | 'secondary' | 'success' | 'danger'
export type ButtonActionRow = ActionRowBuilder<ButtonBuilder>
export type ReplyInput = string | { content: string; ephemeral?: boolean; components?: ButtonActionRow[] }
export type DeferInput = { ephemeral?: boolean }

export interface ComponentsBuilder {
  button<TServices, TParams extends ParamsRecord>(
    button: ButtonIR<TServices, TParams>,
    options: {
      params: InferParams<TParams>
      label: string
      style?: ButtonStyleName
    },
  ): ButtonActionRow
}

export interface CommandContext<TOptions, TServices> {
  options: TOptions
  services: TServices
  components: ComponentsBuilder
  reply(input: ReplyInput): Promise<void>
  defer(input?: DeferInput): Promise<void>
}

export interface EventContext<TServices> {
  services: TServices
  client: Client
}

export interface ButtonContext<TParams, TServices> {
  params: TParams
  services: TServices
  update(input: ReplyInput): Promise<void>
  reply(input: ReplyInput): Promise<void>
  defer(): Promise<void>
}
