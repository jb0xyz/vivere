import type { AutocompleteChoice, DeferInput, InteractionMember, ModalSpec, ReplyInput } from '../authoring/types.js'
import type { OptionKind } from '../authoring/opt.js'

export interface AdapterIdentity {
  readonly userId?: string
  readonly guildId?: string
  readonly locale?: string
  readonly member?: InteractionMember
}

export interface ChatInputInteractionAdapter extends AdapterIdentity {
  readonly kind: 'command'
  readonly commandName: string
  readonly route: string[]
  getOption(name: string, kind: OptionKind, required: boolean): unknown
  reply(input: ReplyInput): Promise<void>
  deferReply(input?: DeferInput): Promise<void>
  showModal(input: ModalSpec): Promise<void>
}

export interface UserCommandInteractionAdapter extends AdapterIdentity {
  readonly kind: 'userCommand'
  readonly commandName: string
  readonly targetUser: unknown
  reply(input: ReplyInput): Promise<void>
  deferReply(input?: DeferInput): Promise<void>
}

export interface MessageCommandInteractionAdapter extends AdapterIdentity {
  readonly kind: 'messageCommand'
  readonly commandName: string
  readonly targetMessage: unknown
  reply(input: ReplyInput): Promise<void>
  deferReply(input?: DeferInput): Promise<void>
}

export interface AutocompleteInteractionAdapter extends AdapterIdentity {
  readonly kind: 'autocomplete'
  readonly commandName: string
  readonly route: string[]
  readonly focusedName: string
  readonly focusedValue: string
  respond(choices: AutocompleteChoice[]): Promise<void>
}

export interface ButtonInteractionAdapter extends AdapterIdentity {
  readonly kind: 'button'
  readonly customId: string
  update(input: ReplyInput): Promise<void>
  reply(input: ReplyInput): Promise<void>
  deferUpdate(): Promise<void>
  showModal(input: ModalSpec): Promise<void>
}

export interface SelectInteractionAdapter extends AdapterIdentity {
  readonly kind: 'select'
  readonly customId: string
  readonly values: string[]
  update(input: ReplyInput): Promise<void>
  reply(input: ReplyInput): Promise<void>
  deferUpdate(): Promise<void>
  showModal(input: ModalSpec): Promise<void>
}

export interface ModalInteractionAdapter extends AdapterIdentity {
  readonly kind: 'modal'
  readonly customId: string
  readonly fields: Record<string, string>
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
