import type { ButtonDescriptor, SelectDescriptor } from './ir.js'

export type ButtonStyleName = 'primary' | 'secondary' | 'success' | 'danger'
export interface SelectOptionSpec {
  label: string
  value: string
}
export interface ButtonSpec {
  type: 'button'
  customId: string
  label: string
  style: ButtonStyleName
}
export interface SelectSpec {
  type: 'select'
  customId: string
  placeholder?: string
  options: SelectOptionSpec[]
}
export type ComponentSpec = ButtonSpec | SelectSpec
export interface ActionRowSpec {
  type: 'row'
  components: ComponentSpec[]
}
export type ButtonActionRow = ActionRowSpec
export type ReplyInput = string | { content: string; ephemeral?: boolean; components?: ActionRowSpec[] }
export type DeferInput = { ephemeral?: boolean }

export interface ButtonDefinitionForParams<TParams extends Record<string, unknown>> {
  readonly descriptor: ButtonDescriptor
  readonly __params?: TParams
}

export interface SelectDefinitionForParams<TParams extends Record<string, unknown>> {
  readonly descriptor: SelectDescriptor
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
  select<TParams extends Record<string, unknown>>(
    select: SelectDefinitionForParams<TParams>,
    options: {
      params: NoInfer<TParams>
      placeholder?: string
      options: SelectOptionSpec[]
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

export interface SelectContext<TParams, TServices> extends ButtonContext<TParams, TServices> {
  values: string[]
}
