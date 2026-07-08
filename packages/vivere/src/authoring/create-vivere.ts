import type { Client, ClientEvents } from 'discord.js'
import type { ButtonContext, CommandContext, EventContext, ModalContext, SelectContext } from './types.js'
import type {
  ButtonDescriptor,
  CommandDescriptor,
  ComponentDescriptor,
  EventDescriptor,
  FieldDescriptor,
  ModalDescriptor,
  OptionDescriptor,
  ParamDescriptor,
  SelectDescriptor,
} from './ir.js'
import { toDiscordName } from './naming.js'
import type { AutocompleteResolver, InferOptions, OptionsRecord } from './opt.js'
import { createOpt } from './opt.js'
import type { InferParams, ParamsRecord } from './param.js'
import { param } from './param.js'
import type { FieldsRecord, InferFields } from './field.js'
import { field } from './field.js'

export interface ParamCodec {
  encode(value: unknown): string
  decode(raw: string): unknown
}

export interface CommandDefinition<TServices = unknown> {
  readonly descriptor: CommandDescriptor
  readonly autocomplete: Record<string, AutocompleteResolver<TServices>>
  readonly execute?: (ctx: CommandContext<Record<string, unknown>, TServices>) => Promise<void>
}

export interface CommandInput<TOptions extends OptionsRecord<TServices>, TServices> {
  name: string
  description: string
  options?: TOptions
  execute?(ctx: CommandContext<InferOptions<TOptions>, TServices>): Promise<void>
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

export interface SelectDefinition<TServices = unknown, TParams extends ParamsRecord = ParamsRecord> {
  readonly descriptor: SelectDescriptor
  readonly codecs: Record<string, ParamCodec>
  readonly __params?: InferParams<TParams>
  readonly execute: (ctx: SelectContext<Record<string, unknown>, TServices>) => Promise<void>
}

export interface SelectInput<TParams extends ParamsRecord, TServices> {
  id: string
  params?: TParams
  execute(ctx: SelectContext<InferParams<TParams>, TServices>): Promise<void>
}

export interface ModalDefinition<
  TServices = unknown,
  TParams extends ParamsRecord = ParamsRecord,
  TFields extends FieldsRecord = FieldsRecord,
> {
  readonly descriptor: ModalDescriptor
  readonly codecs: Record<string, ParamCodec>
  readonly __params?: InferParams<TParams>
  readonly __fields?: InferFields<TFields>
  readonly execute: (ctx: ModalContext<Record<string, unknown>, Record<string, string>, TServices>) => Promise<void>
}

export interface ModalInput<TParams extends ParamsRecord, TFields extends FieldsRecord, TServices> {
  id: string
  params?: TParams
  fields: TFields
  execute(ctx: ModalContext<InferParams<TParams>, InferFields<TFields>, TServices>): Promise<void>
}

export type ComponentDefinition<TServices = unknown> =
  | ButtonDefinition<TServices>
  | SelectDefinition<TServices>
  | ModalDefinition<TServices>

function createOptionDescriptors<TServices>(options: OptionsRecord<TServices>): OptionDescriptor[] {
  return Object.entries(options).map(([property, node]) => ({
    property,
    name: toDiscordName(property),
    kind: node.kind,
    description: node.description,
    required: node.presence === 'required',
    ...(node.autocompleteResolver ? { autocomplete: true } : {}),
  }))
}

function createAutocompleteResolvers<TServices>(
  options: OptionsRecord<TServices>,
): Record<string, AutocompleteResolver<TServices>> {
  const resolverList: Array<[string, AutocompleteResolver<TServices>]> = []
  for (const [property, node] of Object.entries(options)) {
    if (node.autocompleteResolver) {
      resolverList.push([toDiscordName(property), node.autocompleteResolver as AutocompleteResolver<TServices>])
    }
  }
  return Object.fromEntries(resolverList)
}

function createParamDescriptors(params: ParamsRecord): ParamDescriptor[] {
  return Object.entries(params).map(([name, node]) => ({
    name,
    kind: node.kind,
    ...(node.maxLength === undefined ? {} : { maxLength: node.maxLength }),
    ...(node.values === undefined ? {} : { values: node.values }),
  }))
}

function createFieldDescriptors(fields: FieldsRecord): FieldDescriptor[] {
  return Object.entries(fields).map(([name, node]) => ({
    name,
    style: node.style,
    label: node.label,
    required: node.required,
    ...(node.maxLength === undefined ? {} : { maxLength: node.maxLength }),
    ...(node.minLength === undefined ? {} : { minLength: node.minLength }),
    ...(node.placeholder === undefined ? {} : { placeholder: node.placeholder }),
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

function createComponentDescriptor(
  kind: ComponentDescriptor['kind'],
  id: string,
  params: ParamsRecord,
  fields?: FieldsRecord,
): ComponentDescriptor {
  if (!/^[a-z0-9-]+$/.test(id)) throw new Error(`Invalid component id: ${id}`)

  if (kind === 'button') {
    return {
      kind,
      componentKind: kind,
      id,
      params: createParamDescriptors(params),
    }
  }

  if (kind === 'select') {
    return {
      kind,
      componentKind: kind,
      id,
      params: createParamDescriptors(params),
    }
  }

  return {
    kind,
    componentKind: kind,
    id,
    params: createParamDescriptors(params),
    fields: createFieldDescriptors(fields ?? {}),
  }
}

export function createVivere<TServices>() {
  const boundOpt = createOpt<TServices>()

  function defineCommand<TOptions extends OptionsRecord<TServices> = Record<string, never>>(
    input: CommandInput<TOptions, TServices>,
  ): CommandDefinition<TServices> {
    const options = input.options ?? ({} as TOptions)
    const descriptor: CommandDescriptor = {
      kind: 'command',
      name: input.name,
      description: input.description,
      route: [input.name],
      options: createOptionDescriptors(options),
    }
    const autocomplete = createAutocompleteResolvers(options)
    if (!input.execute) return { descriptor, autocomplete }
    return {
      descriptor,
      autocomplete,
      execute: input.execute as NonNullable<CommandDefinition<TServices>['execute']>,
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
    const params = input.params ?? ({} as TParams)

    return {
      descriptor: createComponentDescriptor('button', input.id, params) as ButtonDescriptor,
      codecs: createParamCodecs(params),
      execute: input.execute as ButtonDefinition<TServices, TParams>['execute'],
    }
  }

  function defineSelect<TParams extends ParamsRecord = Record<string, never>>(
    input: SelectInput<TParams, TServices>,
  ): SelectDefinition<TServices, TParams> {
    const params = input.params ?? ({} as TParams)

    return {
      descriptor: createComponentDescriptor('select', input.id, params) as SelectDescriptor,
      codecs: createParamCodecs(params),
      execute: input.execute as SelectDefinition<TServices, TParams>['execute'],
    }
  }

  function defineModal<
    TParams extends ParamsRecord = Record<string, never>,
    TFields extends FieldsRecord = Record<string, never>,
  >(input: ModalInput<TParams, TFields, TServices>): ModalDefinition<TServices, TParams, TFields> {
    const params = input.params ?? ({} as TParams)

    return {
      descriptor: createComponentDescriptor('modal', input.id, params, input.fields) as ModalDescriptor,
      codecs: createParamCodecs(params),
      execute: input.execute as ModalDefinition<TServices, TParams, TFields>['execute'],
    }
  }

  return { defineCommand, defineEvent, defineButton, defineSelect, defineModal, opt: boundOpt, param, field }
}
