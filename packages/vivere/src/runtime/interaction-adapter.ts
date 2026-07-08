import type { AutocompleteChoice, DeferInput, ModalSpec, ReplyInput } from '../authoring/types.js'
import type { OptionKind } from '../authoring/opt.js'

export interface AdapterIdentity {
  readonly userId?: string
  readonly guildId?: string
}

export interface ChatInputInteractionAdapter {
  readonly kind: 'command'
  readonly commandName: string
  readonly route: string[]
  readonly userId?: string
  readonly guildId?: string
  getOption(name: string, kind: OptionKind, required: boolean): unknown
  reply(input: ReplyInput): Promise<void>
  deferReply(input?: DeferInput): Promise<void>
  showModal(input: ModalSpec): Promise<void>
}

export interface UserCommandInteractionAdapter {
  readonly kind: 'userCommand'
  readonly commandName: string
  readonly targetUser: unknown
  readonly userId?: string
  readonly guildId?: string
  reply(input: ReplyInput): Promise<void>
  deferReply(input?: DeferInput): Promise<void>
}

export interface MessageCommandInteractionAdapter {
  readonly kind: 'messageCommand'
  readonly commandName: string
  readonly targetMessage: unknown
  readonly userId?: string
  readonly guildId?: string
  reply(input: ReplyInput): Promise<void>
  deferReply(input?: DeferInput): Promise<void>
}

export interface AutocompleteInteractionAdapter {
  readonly kind: 'autocomplete'
  readonly commandName: string
  readonly route: string[]
  readonly focusedName: string
  readonly focusedValue: string
  readonly userId?: string
  readonly guildId?: string
  respond(choices: AutocompleteChoice[]): Promise<void>
}

export interface ButtonInteractionAdapter {
  readonly kind: 'button'
  readonly customId: string
  readonly userId?: string
  readonly guildId?: string
  update(input: ReplyInput): Promise<void>
  reply(input: ReplyInput): Promise<void>
  deferUpdate(): Promise<void>
  showModal(input: ModalSpec): Promise<void>
}

export interface SelectInteractionAdapter {
  readonly kind: 'select'
  readonly customId: string
  readonly values: string[]
  readonly userId?: string
  readonly guildId?: string
  update(input: ReplyInput): Promise<void>
  reply(input: ReplyInput): Promise<void>
  deferUpdate(): Promise<void>
  showModal(input: ModalSpec): Promise<void>
}

export interface ModalInteractionAdapter {
  readonly kind: 'modal'
  readonly customId: string
  readonly fields: Record<string, string>
  readonly userId?: string
  readonly guildId?: string
  reply(input: ReplyInput): Promise<void>
  defer(input?: DeferInput): Promise<void>
}

export type ComponentInteractionAdapter = ButtonInteractionAdapter | SelectInteractionAdapter | ModalInteractionAdapter
export type ContextMenuInteractionAdapter = UserCommandInteractionAdapter | MessageCommandInteractionAdapter
export type InteractionAdapter =
  | ChatInputInteractionAdapter
  | AutocompleteInteractionAdapter
  | ContextMenuInteractionAdapter
  | ComponentInteractionAdapter
