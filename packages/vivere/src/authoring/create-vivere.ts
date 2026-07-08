import type { Client, ClientEvents } from 'discord.js'
import type { ButtonContext, CommandContext, EventContext } from './types.js'
import type { ButtonDescriptor, CommandDescriptor, EventDescriptor, OptionDescriptor, ParamDescriptor } from './ir.js'
import { toDiscordName } from './naming.js'
import type { InferOptions, OptionsRecord } from './opt.js'
import { opt } from './opt.js'
import type { InferParams, ParamsRecord } from './param.js'
import { param } from './param.js'

export interface ParamCodec {
  encode(value: unknown): string
  decode(raw: string): unknown
}

export interface CommandDefinition<TServices = unknown> {
  readonly descriptor: CommandDescriptor
  readonly execute: (ctx: CommandContext<Record<string, unknown>, TServices>) => Promise<void>
}

export interface CommandInput<TOptions extends OptionsRecord, TServices> {
  name: string
  description: string
  options?: TOptions
  execute(ctx: CommandContext<InferOptions<TOptions>, TServices>): Promise<void>
}

export interface EventDefinition<TServices = unknown> {
  readonly descriptor: EventDescriptor
  readonly execute: (ctx: EventContext<TServices>, ...args: unknown[]) => Promise<void>
}

export interface EventInput<K extends keyof ClientEvents, TServices> {
  name: K
  once?: boolean
  execute(ctx: EventContext<TServices, Client>, ...args: ClientEvents[K]): Promise<void>
}

export interface ButtonDefinition<TServices = unknown, TParams extends ParamsRecord = ParamsRecord> {
  readonly descriptor: ButtonDescriptor
  readonly codecs: Record<string, ParamCodec>
  readonly __params?: InferParams<TParams>
  readonly execute: (ctx: ButtonContext<Record<string, unknown>, TServices>) => Promise<void>
}

export interface ButtonInput<TParams extends ParamsRecord, TServices> {
  id: string
  params?: TParams
  execute(ctx: ButtonContext<InferParams<TParams>, TServices>): Promise<void>
}

function createOptionDescriptors(options: OptionsRecord): OptionDescriptor[] {
  return Object.entries(options).map(([property, node]) => ({
    property,
    name: toDiscordName(property),
    kind: node.kind,
    description: node.description,
    required: node.presence === 'required',
  }))
}

function createParamDescriptors(params: ParamsRecord): ParamDescriptor[] {
  return Object.entries(params).map(([name, node]) => ({
    name,
    kind: node.kind,
    ...(node.maxLength === undefined ? {} : { maxLength: node.maxLength }),
    ...(node.values === undefined ? {} : { values: node.values }),
  }))
}

function createParamCodecs(params: ParamsRecord): Record<string, ParamCodec> {
  return Object.fromEntries(
    Object.entries(params).map(([name, node]) => [
      name,
      {
        encode: (value: unknown) => node.encode(value as never),
        decode: (raw: string) => node.decode(raw),
      },
    ]),
  )
}

export function createVivere<TServices>() {
  function defineCommand<TOptions extends OptionsRecord = Record<string, never>>(
    input: CommandInput<TOptions, TServices>,
  ): CommandDefinition<TServices> {
    const options = input.options ?? {}
    return {
      descriptor: {
        kind: 'command',
        name: input.name,
        description: input.description,
        route: [input.name],
        options: createOptionDescriptors(options),
      },
      execute: input.execute as CommandDefinition<TServices>['execute'],
    }
  }

  function defineEvent<K extends keyof ClientEvents>(input: EventInput<K, TServices>): EventDefinition<TServices> {
    return {
      descriptor: {
        kind: 'event',
        name: input.name,
        once: input.once ?? false,
      },
      execute: input.execute as EventDefinition<TServices>['execute'],
    }
  }

  function defineButton<TParams extends ParamsRecord = Record<string, never>>(
    input: ButtonInput<TParams, TServices>,
  ): ButtonDefinition<TServices, TParams> {
    if (!/^[a-z0-9-]+$/.test(input.id)) throw new Error(`Invalid button id: ${input.id}`)
    const params = input.params ?? ({} as TParams)

    return {
      descriptor: {
        kind: 'button',
        componentKind: 'button',
        id: input.id,
        params: createParamDescriptors(params),
      },
      codecs: createParamCodecs(params),
      execute: input.execute as ButtonDefinition<TServices, TParams>['execute'],
    }
  }

  return { defineCommand, defineEvent, defineButton, opt, param }
}
