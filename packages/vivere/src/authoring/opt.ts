import type { Attachment, Role, User } from 'discord.js'

export type Presence = 'required' | 'optional'
export type OptionKind =
  | 'string'
  | 'integer'
  | 'number'
  | 'boolean'
  | 'user'
  | 'role'
  | 'attachment'

export interface OptionNode<TValue, TPresence extends Presence> {
  readonly kind: OptionKind
  readonly description: string
  readonly presence: TPresence
  optional(): OptionNode<TValue, 'optional'>
}

function node<TValue>(kind: OptionKind, description: string): OptionNode<TValue, 'required'> {
  return {
    kind,
    description,
    presence: 'required',
    optional() {
      return { ...this, presence: 'optional' } as OptionNode<TValue, 'optional'>
    },
  }
}

export const opt = {
  string: (description: string) => node<string>('string', description),
  integer: (description: string) => node<number>('integer', description),
  number: (description: string) => node<number>('number', description),
  boolean: (description: string) => node<boolean>('boolean', description),
  user: (description: string) => node<User>('user', description),
  role: (description: string) => node<Role>('role', description),
  attachment: (description: string) => node<Attachment>('attachment', description),
}

export type AnyOption = OptionNode<unknown, Presence>
export type OptionsRecord = Record<string, AnyOption>

export type InferOptions<T extends OptionsRecord> = {
  [K in keyof T]: T[K] extends OptionNode<infer V, infer P>
    ? P extends 'optional'
      ? V | undefined
      : V
    : never
}
