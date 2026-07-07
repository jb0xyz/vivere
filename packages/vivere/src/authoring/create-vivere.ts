import type { CommandContext } from './types.js'
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
  return { defineCommand, opt }
}
