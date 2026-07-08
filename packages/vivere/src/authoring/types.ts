import type { ButtonDescriptor } from './ir.js'

export type ButtonStyleName = 'primary' | 'secondary' | 'success' | 'danger'
export interface ButtonSpec {
  type: 'button'
  customId: string
  label: string
  style: ButtonStyleName
}
export interface ActionRowSpec {
  type: 'row'
  components: ButtonSpec[]
}
export type ButtonActionRow = ActionRowSpec
export type ReplyInput = string | { content: string; ephemeral?: boolean; components?: ActionRowSpec[] }
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
  ): ActionRowSpec
}

export interface CommandContext<TOptions, TServices> {
  options: TOptions
  services: TServices
  components: ComponentsBuilder
  reply(input: ReplyInput): Promise<void>
  defer(input?: DeferInput): Promise<void>
}

export interface EventContext<TServices, TClient = unknown> {
  services: TServices
  client: TClient
}

export interface ButtonContext<TParams, TServices> {
  params: TParams
  services: TServices
  components: ComponentsBuilder
  update(input: ReplyInput): Promise<void>
  reply(input: ReplyInput): Promise<void>
  defer(): Promise<void>
}
