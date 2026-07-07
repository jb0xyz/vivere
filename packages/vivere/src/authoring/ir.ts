import type { ClientEvents } from 'discord.js'
import type { OptionKind } from './opt.js'
import type { ParamKind } from './param.js'

export interface OptionDescriptor {
  property: string
  name: string
  kind: OptionKind
  description: string
  required: boolean
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
  id: string
  params: ParamDescriptor[]
}

export interface EventDescriptor {
  kind: 'event'
  name: keyof ClientEvents
  once: boolean
}
