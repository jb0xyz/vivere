import type { ClientEvents } from 'discord.js'
import type { CommandContext, EventContext } from './types.js'
import type { InferOptions, OptionsRecord } from './opt.js'
import { opt } from './opt.js'

export interface CommandIR<TServices = unknown> {
  readonly kind: 'command'
  readonly name: string
  readonly description: string
  readonly options: OptionsRecord
  readonly execute: (ctx: CommandContext<Record<string, unknown>, TServices>) => Promise<void>
}

export interface CommandInput<TOptions extends OptionsRecord, TServices> {
  name: string
  description: string
  options?: TOptions
  execute(ctx: CommandContext<InferOptions<TOptions>, TServices>): Promise<void>
}

export interface EventIR<TServices = unknown> {
  readonly kind: 'event'
  readonly name: keyof ClientEvents
  readonly once: boolean
  readonly execute: (ctx: EventContext<TServices>, ...args: unknown[]) => Promise<void>
}

export interface EventInput<K extends keyof ClientEvents, TServices> {
  name: K
  once?: boolean
  execute(ctx: EventContext<TServices>, ...args: ClientEvents[K]): Promise<void>
}

export function createVivere<TServices>() {
  function defineCommand<TOptions extends OptionsRecord = Record<string, never>>(
    input: CommandInput<TOptions, TServices>,
  ): CommandIR<TServices> {
    return {
      kind: 'command',
      name: input.name,
      description: input.description,
      options: input.options ?? {},
      execute: input.execute as CommandIR<TServices>['execute'],
    }
  }

  function defineEvent<K extends keyof ClientEvents>(input: EventInput<K, TServices>): EventIR<TServices> {
    return {
      kind: 'event',
      name: input.name,
      once: input.once ?? false,
      execute: input.execute as EventIR<TServices>['execute'],
    }
  }

  return { defineCommand, defineEvent, opt }
}
