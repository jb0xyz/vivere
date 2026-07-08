import type { ButtonDescriptor, ModalDescriptor, SelectDescriptor } from './ir.js'
import type { StorePorts } from '../stores/types.js'

export type ButtonStyleName = 'primary' | 'secondary' | 'success' | 'danger'
export type ModalFieldStyleName = 'short' | 'paragraph'
export interface AutocompleteChoice {
  name: string
  value: string
}
export interface InteractionIdentity {
  userId: string
  guildId?: string
}

export interface AutocompleteContext<TServices> extends InteractionIdentity {
  services: TServices
  stores: StorePorts
  value: string
}
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
export interface ModalFieldSpec {
  key: string
  label: string
  style: ModalFieldStyleName
  required: boolean
  maxLength?: number
  minLength?: number
  placeholder?: string
}
export interface ModalSpec {
  customId: string
  title: string
  fields: ModalFieldSpec[]
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

export interface ModalDefinitionForParams<TParams extends Record<string, unknown>> {
  readonly descriptor: ModalDescriptor
  readonly __params?: TParams
}

export interface ShowModalOptions<TParams extends Record<string, unknown>> {
  params: NoInfer<TParams>
  title: string
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

export interface CommandContext<TOptions, TServices> extends InteractionIdentity {
  options: TOptions
  services: TServices
  stores: StorePorts
  components: ComponentsBuilder
  reply(input: ReplyInput): Promise<void>
  defer(input?: DeferInput): Promise<void>
  showModal<TParams extends Record<string, unknown>>(
    modal: ModalDefinitionForParams<TParams>,
    options: ShowModalOptions<TParams>,
  ): Promise<void>
}

export interface UserCommandContext<TServices, TTargetUser = unknown> extends InteractionIdentity {
  services: TServices
  stores: StorePorts
  targetUser: TTargetUser
  reply(input: ReplyInput): Promise<void>
  defer(input?: DeferInput): Promise<void>
}

export interface MessageCommandContext<TServices, TTargetMessage = unknown> extends InteractionIdentity {
  services: TServices
  stores: StorePorts
  targetMessage: TTargetMessage
  reply(input: ReplyInput): Promise<void>
  defer(input?: DeferInput): Promise<void>
}

export interface EventContext<TServices, TClient = unknown> extends InteractionIdentity {
  services: TServices
  stores: StorePorts
  client: TClient
}

export interface ButtonContext<TParams, TServices> extends InteractionIdentity {
  params: TParams
  services: TServices
  stores: StorePorts
  components: ComponentsBuilder
  update(input: ReplyInput): Promise<void>
  reply(input: ReplyInput): Promise<void>
  defer(): Promise<void>
  showModal<TModalParams extends Record<string, unknown>>(
    modal: ModalDefinitionForParams<TModalParams>,
    options: ShowModalOptions<TModalParams>,
  ): Promise<void>
}

export interface SelectContext<TParams, TServices> extends ButtonContext<TParams, TServices> {
  values: string[]
}

export interface ModalContext<TParams, TFields, TServices> extends InteractionIdentity {
  params: TParams
  fields: TFields
  services: TServices
  stores: StorePorts
  reply(input: ReplyInput): Promise<void>
  defer(input?: DeferInput): Promise<void>
}
