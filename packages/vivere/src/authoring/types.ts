import type { ActionRowBuilder, ButtonBuilder, Client } from 'discord.js'
import type { ButtonDescriptor } from './ir.js'

export type ButtonStyleName = 'primary' | 'secondary' | 'success' | 'danger'
export type ButtonActionRow = ActionRowBuilder<ButtonBuilder>
export type ReplyInput = string | { content: string; ephemeral?: boolean; components?: ButtonActionRow[] }
export type DeferInput = { ephemeral?: boolean }

export interface ButtonDefinitionForParams<TParams extends Record<string, unknown>> {
  readonly descriptor: ButtonDescriptor
  readonly __params?: TParams
}

export interface ComponentsBuilder {
  button<TParams extends Record<string, unknown>>(
    button: ButtonDefinitionForParams<TParams>,
    options: {
      params: NoInfer<TParams>
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
