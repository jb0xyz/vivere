import type { Client, ClientEvents, Message, User } from 'discord.js'
import type {
  ButtonContext,
  CommandContext,
  EventContext,
  MessageCommandContext,
  ModalContext,
  SelectContext,
  UserCommandContext,
} from './types.js'
import type {
  ButtonDescriptor,
  CommandLocalizations,
  CommandDescriptor,
  ComponentDescriptor,
  EventDescriptor,
  FieldDescriptor,
  MessageCommandDescriptor,
  ModalDescriptor,
  OptionDescriptor,
  ParamDescriptor,
  PolicyDescriptor,
  SelectDescriptor,
  UserCommandDescriptor,
} from './ir.js'
import { toDiscordName } from './naming.js'
import type {
  AnyMiddlewareDefinition,
  InferMiddlewareExtensions,
  MiddlewareDefinition,
  MiddlewareInput,
} from './middleware.js'
import { defineMiddleware as createMiddleware } from './middleware.js'
import type { PolicyDefinition } from './policies.js'
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
  readonly middleware: AnyMiddlewareDefinition<TServices>[]
  readonly policies: PolicyDefinition[]
  readonly autocomplete: Record<string, AutocompleteResolver<TServices>>
  readonly execute?: (ctx: CommandContext<Record<string, unknown>, TServices>) => Promise<void>
}

export interface CommandInput<
  TOptions extends OptionsRecord<TServices>,
  TServices,
  TMiddlewareList extends readonly AnyMiddlewareDefinition<TServices>[] = [],
> {
  name: string
  description: string
  options?: TOptions
  use?: TMiddlewareList
  policies?: readonly PolicyDefinition[]
  localizations?: CommandLocalizations
  execute?(ctx: CommandContext<InferOptions<TOptions>, TServices> & InferMiddlewareExtensions<TMiddlewareList>): Promise<void>
}

export interface UserCommandDefinition<TServices = unknown> {
  readonly descriptor: UserCommandDescriptor
  readonly middleware: AnyMiddlewareDefinition<TServices>[]
  readonly policies: PolicyDefinition[]
  readonly execute: (ctx: UserCommandContext<TServices>) => Promise<void>
}

export interface UserCommandInput<
  TServices,
  TMiddlewareList extends readonly AnyMiddlewareDefinition<TServices>[] = [],
> {
  name: string
  use?: TMiddlewareList
  policies?: readonly PolicyDefinition[]
  localizations?: CommandLocalizations
  execute(ctx: UserCommandContext<TServices, User> & InferMiddlewareExtensions<TMiddlewareList>): Promise<void>
}

export interface MessageCommandDefinition<TServices = unknown> {
  readonly descriptor: MessageCommandDescriptor
  readonly middleware: AnyMiddlewareDefinition<TServices>[]
  readonly policies: PolicyDefinition[]
  readonly execute: (ctx: MessageCommandContext<TServices>) => Promise<void>
}

export interface MessageCommandInput<
  TServices,
  TMiddlewareList extends readonly AnyMiddlewareDefinition<TServices>[] = [],
> {
  name: string
  use?: TMiddlewareList
  policies?: readonly PolicyDefinition[]
  localizations?: CommandLocalizations
  execute(ctx: MessageCommandContext<TServices, Message> & InferMiddlewareExtensions<TMiddlewareList>): Promise<void>
}

export type ApplicationCommandDefinition<TServices = unknown> =
  | CommandDefinition<TServices>
  | UserCommandDefinition<TServices>
  | MessageCommandDefinition<TServices>

export interface EventDefinition<TServices = unknown> {
  readonly descriptor: EventDescriptor
  readonly middleware: AnyMiddlewareDefinition<TServices>[]
  readonly execute: (ctx: EventContext<TServices>, ...args: unknown[]) => Promise<void>
}

export interface EventInput<
  K extends keyof ClientEvents,
  TServices,
  TMiddlewareList extends readonly AnyMiddlewareDefinition<TServices>[] = [],
> {
  name: K
  once?: boolean
  use?: TMiddlewareList
  execute(ctx: EventContext<TServices, Client> & InferMiddlewareExtensions<TMiddlewareList>, ...args: ClientEvents[K]): Promise<void>
}

export interface ButtonDefinition<TServices = unknown, TParams extends ParamsRecord = ParamsRecord> {
  readonly descriptor: ButtonDescriptor
  readonly middleware: AnyMiddlewareDefinition<TServices>[]
  readonly policies: PolicyDefinition[]
  readonly codecs: Record<string, ParamCodec>
  readonly __params?: InferParams<TParams>
  readonly execute: (ctx: ButtonContext<Record<string, unknown>, TServices>) => Promise<void>
}

export interface ButtonInput<
  TParams extends ParamsRecord,
  TServices,
  TMiddlewareList extends readonly AnyMiddlewareDefinition<TServices>[] = [],
> {
  id: string
  params?: TParams
  use?: TMiddlewareList
  policies?: readonly PolicyDefinition[]
  execute(ctx: ButtonContext<InferParams<TParams>, TServices> & InferMiddlewareExtensions<TMiddlewareList>): Promise<void>
}

export interface SelectDefinition<TServices = unknown, TParams extends ParamsRecord = ParamsRecord> {
  readonly descriptor: SelectDescriptor
  readonly middleware: AnyMiddlewareDefinition<TServices>[]
  readonly policies: PolicyDefinition[]
  readonly codecs: Record<string, ParamCodec>
  readonly __params?: InferParams<TParams>
  readonly execute: (ctx: SelectContext<Record<string, unknown>, TServices>) => Promise<void>
}

export interface SelectInput<
  TParams extends ParamsRecord,
  TServices,
  TMiddlewareList extends readonly AnyMiddlewareDefinition<TServices>[] = [],
> {
  id: string
  params?: TParams
  use?: TMiddlewareList
  policies?: readonly PolicyDefinition[]
  execute(ctx: SelectContext<InferParams<TParams>, TServices> & InferMiddlewareExtensions<TMiddlewareList>): Promise<void>
}

export interface ModalDefinition<
  TServices = unknown,
  TParams extends ParamsRecord = ParamsRecord,
  TFields extends FieldsRecord = FieldsRecord,
> {
  readonly descriptor: ModalDescriptor
  readonly middleware: AnyMiddlewareDefinition<TServices>[]
  readonly policies: PolicyDefinition[]
  readonly codecs: Record<string, ParamCodec>
  readonly __params?: InferParams<TParams>
  readonly __fields?: InferFields<TFields>
  readonly execute: (ctx: ModalContext<Record<string, unknown>, Record<string, string>, TServices>) => Promise<void>
}

export interface ModalInput<
  TParams extends ParamsRecord,
  TFields extends FieldsRecord,
  TServices,
  TMiddlewareList extends readonly AnyMiddlewareDefinition<TServices>[] = [],
> {
  id: string
  params?: TParams
  fields: TFields
  use?: TMiddlewareList
  policies?: readonly PolicyDefinition[]
  execute(
    ctx: ModalContext<InferParams<TParams>, InferFields<TFields>, TServices> &
      InferMiddlewareExtensions<TMiddlewareList>,
  ): Promise<void>
}

export type ComponentDefinition<TServices = unknown> =
  | ButtonDefinition<TServices>
  | SelectDefinition<TServices>
  | ModalDefinition<TServices>

export interface PluginDefinition<TServices = unknown> {
  readonly name: string
  readonly commands: ApplicationCommandDefinition<TServices>[]
  readonly events: EventDefinition<TServices>[]
  readonly components: ComponentDefinition<TServices>[]
  readonly setup?: () => Promise<void> | void
  readonly dispose?: () => Promise<void> | void
}

export interface PluginInput<TServices> {
  name: string
  commands?: ApplicationCommandDefinition<TServices>[]
  events?: EventDefinition<TServices>[]
  components?: ComponentDefinition<TServices>[]
  setup?: () => Promise<void> | void
  dispose?: () => Promise<void> | void
}

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

function createMiddlewareNames<TServices>(middleware: readonly AnyMiddlewareDefinition<TServices>[] = []): string[] | undefined {
  if (middleware.length === 0) return undefined
  return middleware.map((item) => item.descriptor.name)
}

function createPolicyDescriptors(policies: readonly PolicyDefinition[] = []): PolicyDescriptor[] | undefined {
  if (policies.length === 0) return undefined
  return policies.map((policy) => policy.descriptor)
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
  middleware: readonly AnyMiddlewareDefinition[],
  policies: readonly PolicyDefinition[],
  fields?: FieldsRecord,
): ComponentDescriptor {
  if (!/^[a-z0-9-]+$/.test(id)) throw new Error(`Invalid component id: ${id}`)
  const middlewareNames = createMiddlewareNames(middleware)
  const policyDescriptors = createPolicyDescriptors(policies)

  if (kind === 'button') {
    return {
      kind,
      componentKind: kind,
      id,
      params: createParamDescriptors(params),
      ...(middlewareNames ? { middleware: middlewareNames } : {}),
      ...(policyDescriptors ? { policies: policyDescriptors } : {}),
    }
  }

  if (kind === 'select') {
    return {
      kind,
      componentKind: kind,
      id,
      params: createParamDescriptors(params),
      ...(middlewareNames ? { middleware: middlewareNames } : {}),
      ...(policyDescriptors ? { policies: policyDescriptors } : {}),
    }
  }

  return {
    kind,
    componentKind: kind,
    id,
    params: createParamDescriptors(params),
    fields: createFieldDescriptors(fields ?? {}),
    ...(middlewareNames ? { middleware: middlewareNames } : {}),
    ...(policyDescriptors ? { policies: policyDescriptors } : {}),
  }
}

export function createVivere<TServices>() {
  const boundOpt = createOpt<TServices>()

  function defineCommand<
    TOptions extends OptionsRecord<TServices> = Record<string, never>,
    TMiddlewareList extends readonly AnyMiddlewareDefinition<TServices>[] = [],
  >(
    input: CommandInput<TOptions, TServices, TMiddlewareList>,
  ): CommandDefinition<TServices> {
    const options = input.options ?? ({} as TOptions)
    const middleware = [...(input.use ?? [])] as AnyMiddlewareDefinition<TServices>[]
    const policies = [...(input.policies ?? [])]
    const middlewareNames = createMiddlewareNames(middleware)
    const policyDescriptors = createPolicyDescriptors(policies)
    const descriptor: CommandDescriptor = {
      kind: 'command',
      name: input.name,
      description: input.description,
      route: [input.name],
      options: createOptionDescriptors(options),
      ...(middlewareNames ? { middleware: middlewareNames } : {}),
      ...(policyDescriptors ? { policies: policyDescriptors } : {}),
      ...(input.localizations ? { localizations: input.localizations } : {}),
    }
    const autocomplete = createAutocompleteResolvers(options)
    if (!input.execute) return { descriptor, middleware, policies, autocomplete }
    return {
      descriptor,
      middleware,
      policies,
      autocomplete,
      execute: input.execute as NonNullable<CommandDefinition<TServices>['execute']>,
    }
  }

  function defineEvent<
    K extends keyof ClientEvents,
    TMiddlewareList extends readonly AnyMiddlewareDefinition<TServices>[] = [],
  >(input: EventInput<K, TServices, TMiddlewareList>): EventDefinition<TServices> {
    const middleware = [...(input.use ?? [])] as AnyMiddlewareDefinition<TServices>[]
    return {
      descriptor: {
        kind: 'event',
        name: input.name,
        once: input.once ?? false,
        ...(createMiddlewareNames(middleware) ? { middleware: createMiddlewareNames(middleware) } : {}),
      },
      middleware,
      execute: input.execute as EventDefinition<TServices>['execute'],
    }
  }

  function defineUserCommand<TMiddlewareList extends readonly AnyMiddlewareDefinition<TServices>[] = []>(
    input: UserCommandInput<TServices, TMiddlewareList>,
  ): UserCommandDefinition<TServices> {
    const middleware = [...(input.use ?? [])] as AnyMiddlewareDefinition<TServices>[]
    const policies = [...(input.policies ?? [])]
    const middlewareNames = createMiddlewareNames(middleware)
    const policyDescriptors = createPolicyDescriptors(policies)
    const descriptor: UserCommandDescriptor = {
      kind: 'userCommand',
      name: input.name,
      ...(middlewareNames ? { middleware: middlewareNames } : {}),
      ...(policyDescriptors ? { policies: policyDescriptors } : {}),
      ...(input.localizations ? { localizations: input.localizations } : {}),
    }
    return {
      descriptor,
      middleware,
      policies,
      execute: input.execute as UserCommandDefinition<TServices>['execute'],
    }
  }

  function defineMessageCommand<TMiddlewareList extends readonly AnyMiddlewareDefinition<TServices>[] = []>(
    input: MessageCommandInput<TServices, TMiddlewareList>,
  ): MessageCommandDefinition<TServices> {
    const middleware = [...(input.use ?? [])] as AnyMiddlewareDefinition<TServices>[]
    const policies = [...(input.policies ?? [])]
    const middlewareNames = createMiddlewareNames(middleware)
    const policyDescriptors = createPolicyDescriptors(policies)
    const descriptor: MessageCommandDescriptor = {
      kind: 'messageCommand',
      name: input.name,
      ...(middlewareNames ? { middleware: middlewareNames } : {}),
      ...(policyDescriptors ? { policies: policyDescriptors } : {}),
      ...(input.localizations ? { localizations: input.localizations } : {}),
    }
    return {
      descriptor,
      middleware,
      policies,
      execute: input.execute as MessageCommandDefinition<TServices>['execute'],
    }
  }

  function defineButton<
    TParams extends ParamsRecord = Record<string, never>,
    TMiddlewareList extends readonly AnyMiddlewareDefinition<TServices>[] = [],
  >(
    input: ButtonInput<TParams, TServices, TMiddlewareList>,
  ): ButtonDefinition<TServices, TParams> {
    const params = input.params ?? ({} as TParams)
    const middleware = [...(input.use ?? [])] as AnyMiddlewareDefinition<TServices>[]
    const policies = [...(input.policies ?? [])]

    return {
      descriptor: createComponentDescriptor('button', input.id, params, middleware, policies) as ButtonDescriptor,
      middleware,
      policies,
      codecs: createParamCodecs(params),
      execute: input.execute as ButtonDefinition<TServices, TParams>['execute'],
    }
  }

  function defineSelect<
    TParams extends ParamsRecord = Record<string, never>,
    TMiddlewareList extends readonly AnyMiddlewareDefinition<TServices>[] = [],
  >(
    input: SelectInput<TParams, TServices, TMiddlewareList>,
  ): SelectDefinition<TServices, TParams> {
    const params = input.params ?? ({} as TParams)
    const middleware = [...(input.use ?? [])] as AnyMiddlewareDefinition<TServices>[]
    const policies = [...(input.policies ?? [])]

    return {
      descriptor: createComponentDescriptor('select', input.id, params, middleware, policies) as SelectDescriptor,
      middleware,
      policies,
      codecs: createParamCodecs(params),
      execute: input.execute as SelectDefinition<TServices, TParams>['execute'],
    }
  }

  function defineModal<
    TParams extends ParamsRecord = Record<string, never>,
    TFields extends FieldsRecord = Record<string, never>,
    TMiddlewareList extends readonly AnyMiddlewareDefinition<TServices>[] = [],
  >(input: ModalInput<TParams, TFields, TServices, TMiddlewareList>): ModalDefinition<TServices, TParams, TFields> {
    const params = input.params ?? ({} as TParams)
    const middleware = [...(input.use ?? [])] as AnyMiddlewareDefinition<TServices>[]
    const policies = [...(input.policies ?? [])]

    return {
      descriptor: createComponentDescriptor('modal', input.id, params, middleware, policies, input.fields) as ModalDescriptor,
      middleware,
      policies,
      codecs: createParamCodecs(params),
      execute: input.execute as ModalDefinition<TServices, TParams, TFields>['execute'],
    }
  }

  function defineMiddleware<TExtension extends Record<string, unknown> = Record<string, never>>(
    input: MiddlewareInput<TServices, TExtension>,
  ): MiddlewareDefinition<TServices, TExtension> {
    return createMiddleware(input)
  }

  function definePlugin(input: PluginInput<TServices>): PluginDefinition<TServices> {
    return {
      name: input.name,
      commands: input.commands ?? [],
      events: input.events ?? [],
      components: input.components ?? [],
      ...(input.setup ? { setup: input.setup } : {}),
      ...(input.dispose ? { dispose: input.dispose } : {}),
    }
  }

  return {
    defineCommand,
    defineUserCommand,
    defineMessageCommand,
    defineMiddleware,
    defineEvent,
    defineButton,
    defineSelect,
    defineModal,
    definePlugin,
    opt: boundOpt,
    param,
    field,
  }
}
