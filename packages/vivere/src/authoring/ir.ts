import type { ClientEvents } from 'discord.js'
import type { FieldKind } from './field.js'
import type { OptionKind } from './opt.js'
import type { ParamKind } from './param.js'

export type PolicyScope = 'user' | 'guild' | 'global'

export type PolicyDescriptor =
  | { type: 'permission'; value: string }
  | { type: 'role'; value: string }
  | { type: 'cooldown'; scope: PolicyScope; windowMs: number }
  | { type: 'rateLimit'; scope: PolicyScope; limit: number; windowMs: number }

export interface CommandLocalization {
  name?: string
  description?: string
}

export type CommandLocalizations = Record<string, CommandLocalization>

export interface OptionDescriptor {
  property: string
  name: string
  kind: OptionKind
  description: string
  required: boolean
  autocomplete?: boolean
}

export interface CommandDescriptor {
  kind: 'command'
  name: string
  description: string
  route: string[]
  options: OptionDescriptor[]
  middleware?: string[]
  policies?: PolicyDescriptor[]
  localizations?: CommandLocalizations
}

export interface UserCommandDescriptor {
  kind: 'userCommand'
  name: string
  middleware?: string[]
  policies?: PolicyDescriptor[]
  localizations?: CommandLocalizations
}

export interface MessageCommandDescriptor {
  kind: 'messageCommand'
  name: string
  middleware?: string[]
  policies?: PolicyDescriptor[]
  localizations?: CommandLocalizations
}

export type ApplicationCommandDescriptor = CommandDescriptor | UserCommandDescriptor | MessageCommandDescriptor

export interface ParamDescriptor {
  name: string
  kind: ParamKind
  maxLength?: number
  values?: readonly string[]
}

export interface ButtonDescriptor {
  kind: 'button'
  componentKind: 'button'
  id: string
  params: ParamDescriptor[]
  middleware?: string[]
  policies?: PolicyDescriptor[]
}

export interface SelectDescriptor {
  kind: 'select'
  componentKind: 'select'
  id: string
  params: ParamDescriptor[]
  middleware?: string[]
  policies?: PolicyDescriptor[]
}

export interface FieldDescriptor {
  name: string
  style: FieldKind
  label: string
  required: boolean
  maxLength?: number
  minLength?: number
  placeholder?: string
}

export interface ModalDescriptor {
  kind: 'modal'
  componentKind: 'modal'
  id: string
  params: ParamDescriptor[]
  fields: FieldDescriptor[]
  middleware?: string[]
  policies?: PolicyDescriptor[]
}

export type ComponentDescriptor = ButtonDescriptor | SelectDescriptor | ModalDescriptor

export interface EventDescriptor {
  kind: 'event'
  name: keyof ClientEvents
  once: boolean
  middleware?: string[]
}
