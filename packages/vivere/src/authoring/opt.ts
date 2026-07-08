import type { Attachment, Role, User } from 'discord.js'
import type { AutocompleteChoice, AutocompleteContext } from './types.js'

export type Presence = 'required' | 'optional'
export type OptionKind =
  | 'string'
  | 'integer'
  | 'number'
  | 'boolean'
  | 'user'
  | 'role'
  | 'attachment'

export type AutocompleteResolver<TServices> = (
  ctx: AutocompleteContext<TServices>,
  value: string,
) => AutocompleteChoice[] | Promise<AutocompleteChoice[]>

export interface OptionNode<TValue, TPresence extends Presence, TServices = unknown> {
  readonly kind: OptionKind
  readonly description: string
  readonly presence: TPresence
  readonly autocompleteResolver?: unknown
  optional(): OptionNode<TValue, 'optional', TServices>
  autocomplete(resolver: AutocompleteResolver<TServices>): OptionNode<TValue, TPresence, TServices>
}

function node<TValue, TServices>(kind: OptionKind, description: string): OptionNode<TValue, 'required', TServices> {
  return {
    kind,
    description,
    presence: 'required',
    optional() {
      return { ...this, presence: 'optional' } as unknown as OptionNode<TValue, 'optional', TServices>
    },
    autocomplete(resolver) {
      return { ...this, autocompleteResolver: resolver }
    },
  }
}

export function createOpt<TServices>() {
  return {
    string: (description: string) => node<string, TServices>('string', description),
    integer: (description: string) => node<number, TServices>('integer', description),
    number: (description: string) => node<number, TServices>('number', description),
    boolean: (description: string) => node<boolean, TServices>('boolean', description),
    user: (description: string) => node<User, TServices>('user', description),
    role: (description: string) => node<Role, TServices>('role', description),
    attachment: (description: string) => node<Attachment, TServices>('attachment', description),
  }
}

export const opt = createOpt<unknown>()

export type AnyOption<TServices = unknown> = OptionNode<unknown, Presence, TServices>
export type OptionsRecord<TServices = unknown> = Record<string, AnyOption<TServices>>

export type InferOptions<T> = {
  [K in keyof T]: T[K] extends OptionNode<infer V, infer P, infer TOptionServices>
    ? TOptionServices extends unknown
      ? P extends 'optional'
        ? V | undefined
        : V
      : never
    : never
}
