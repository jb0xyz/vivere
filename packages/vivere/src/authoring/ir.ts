import type { ClientEvents } from 'discord.js'
import type { FieldKind } from './field.js'
import type { OptionKind } from './opt.js'
import type { ParamKind } from './param.js'

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
}

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
}

export interface SelectDescriptor {
  kind: 'select'
  componentKind: 'select'
  id: string
  params: ParamDescriptor[]
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
}

export type ComponentDescriptor = ButtonDescriptor | SelectDescriptor | ModalDescriptor

export interface EventDescriptor {
  kind: 'event'
  name: keyof ClientEvents
  once: boolean
}
