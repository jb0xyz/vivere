import type {
  ApplicationCommandDefinition,
  ButtonDefinition,
  CommandDefinition,
  ComponentDefinition,
  MessageCommandDefinition,
  UserCommandDefinition,
} from '../authoring/create-vivere.js'
import type { AnyMiddlewareDefinition } from '../authoring/middleware.js'
import type { CommandContext, MessageCommandContext, UserCommandContext } from '../authoring/types.js'
import type { ComponentRegistry } from '../components/component-handler.js'
import { getComponentRegistryKey, handleComponent } from '../components/component-handler.js'
import { createComponentsBuilder, createModalSpec } from '../components/component-builder.js'
import { getApplicationCommandKey } from '../internal/application-command-key.js'
import { createRegistry } from '../internal/collections.js'
import type { ErrorReporter } from '../internal/errors.js'
import { reportError as defaultReportError } from '../internal/errors.js'
import { createStorePorts } from '../stores/memory.js'
import type { StorePorts } from '../stores/types.js'
import { getDurationMs, ignoreVivereEvent } from '../internal/observability.js'
import type { VivereEventSink } from '../internal/observability.js'
import { runWithMiddleware } from './middleware.js'
import type {
  AutocompleteInteractionAdapter,
  ChatInputInteractionAdapter,
  InteractionAdapter,
  MessageCommandInteractionAdapter,
  UserCommandInteractionAdapter,
} from './interaction-adapter.js'

export interface DispatchDeps<TServices> {
  services: TServices
  stores?: StorePorts
}

export interface CreateRouterOptions<TServices> {
  commands: ApplicationCommandDefinition<TServices>[]
  buttons?: ButtonDefinition<TServices>[]
  components?: ComponentDefinition<TServices>[]
  middleware?: AnyMiddlewareDefinition<TServices>[]
  secret: string
  stores?: StorePorts
  reportError?: ErrorReporter
  onEvent?: VivereEventSink
}

export interface InteractionRouter<TServices = unknown> {
  dispatch(adapter: InteractionAdapter, deps: DispatchDeps<TServices>): Promise<void>
}

export function createRouter<TServices>(options: CreateRouterOptions<TServices>): InteractionRouter<TServices> {
  const commandRegistry = createRegistry(
    options.commands.filter((command): command is CommandDefinition<TServices> => command.descriptor.kind === 'command'),
    (command) => command.descriptor.route.join('/'),
  )
  const userCommandRegistry = createRegistry(
    options.commands.filter(
      (command): command is UserCommandDefinition<TServices> => command.descriptor.kind === 'userCommand',
    ),
    (command) => getApplicationCommandKey(command.descriptor),
  )
  const messageCommandRegistry = createRegistry(
    options.commands.filter(
      (command): command is MessageCommandDefinition<TServices> => command.descriptor.kind === 'messageCommand',
    ),
    (command) => getApplicationCommandKey(command.descriptor),
  )
  const componentList = [...(options.buttons ?? []), ...(options.components ?? [])]
  const componentRegistry: ComponentRegistry<TServices> = createRegistry(componentList, (component) =>
    getComponentRegistryKey(component.descriptor.componentKind, component.descriptor.id),
  )
  const components = createComponentsBuilder(options.secret)
  const reportError = options.reportError ?? defaultReportError
  const globalMiddleware = options.middleware ?? []
  const stores = options.stores ?? createStorePorts()
  const onEvent = options.onEvent ?? ignoreVivereEvent

  function getMiddleware(definition: { middleware?: AnyMiddlewareDefinition<TServices>[] }) {
    return [...globalMiddleware, ...(definition.middleware ?? [])]
  }

  function getIdentity(adapter: { userId?: string; guildId?: string }) {
    return {
      userId: adapter.userId ?? 'unknown',
      ...(adapter.guildId ? { guildId: adapter.guildId } : {}),
    }
  }

  function getStores(deps: DispatchDeps<TServices>) {
    return deps.stores ?? stores
  }

  async function dispatchCommand(adapter: ChatInputInteractionAdapter, deps: DispatchDeps<TServices>): Promise<void> {
    const route = adapter.route.length > 0 ? adapter.route : [adapter.commandName]
    const routeKey = route.join('/')
    const command = commandRegistry.get(route.join('/'))
    if (!command?.execute) return
    const startedAt = Date.now()
    onEvent({ type: 'command.started', route: routeKey })

    try {
      const resolvedOptions: Record<string, unknown> = {}
      for (const option of command.descriptor.options) {
        resolvedOptions[option.property] = adapter.getOption(option.name, option.kind, option.required)
      }

      const ctx: CommandContext<Record<string, unknown>, TServices> = {
        options: resolvedOptions,
        services: deps.services,
        stores: getStores(deps),
        ...getIdentity(adapter),
        components,
        reply: (input) => adapter.reply(input),
        defer: (input) => adapter.deferReply(input),
        showModal: (modal, input) => adapter.showModal(createModalSpec(options.secret, modal, input)),
      }
      const result = await runWithMiddleware({
        ctx,
        middleware: getMiddleware(command),
        execute: (nextCtx) => command.execute?.(nextCtx) ?? Promise.resolve(),
        reportError,
        errorContext: { phase: 'command', id: routeKey },
        replyUserError: (input) => adapter.reply(input),
      })
      const durationMs = getDurationMs(startedAt)
      if (result.outcome === 'error') onEvent({ type: 'command.failed', route: routeKey, durationMs })
      onEvent({ type: 'command.finished', route: routeKey, durationMs, outcome: result.outcome })
    } catch (error) {
      const durationMs = getDurationMs(startedAt)
      onEvent({ type: 'command.failed', route: routeKey, durationMs })
      onEvent({ type: 'command.finished', route: routeKey, durationMs, outcome: 'error' })
      throw error
    }
  }

  async function dispatchAutocomplete(
    adapter: AutocompleteInteractionAdapter,
    deps: DispatchDeps<TServices>,
  ): Promise<void> {
    const route = adapter.route.length > 0 ? adapter.route : [adapter.commandName]
    const routeKey = route.join('/')
    const command = commandRegistry.get(route.join('/'))
    const resolver = command?.autocomplete[adapter.focusedName]
    if (!resolver) {
      await adapter.respond([])
      return
    }

    try {
      const choices = await resolver(
        {
          services: deps.services,
          stores: getStores(deps),
          value: adapter.focusedValue,
          ...getIdentity(adapter),
        },
        adapter.focusedValue,
      )
      await adapter.respond(choices)
    } catch (error) {
      reportError(error, { phase: 'command', id: routeKey })
      await adapter.respond([])
    }
  }

  async function dispatchUserCommand(
    adapter: UserCommandInteractionAdapter,
    deps: DispatchDeps<TServices>,
  ): Promise<void> {
    const command = userCommandRegistry.get(`userCommand:${adapter.commandName}`)
    if (!command) return
    const startedAt = Date.now()
    const route = adapter.commandName
    onEvent({ type: 'command.started', route })

    try {
      const ctx: UserCommandContext<TServices> = {
        services: deps.services,
        stores: getStores(deps),
        targetUser: adapter.targetUser,
        ...getIdentity(adapter),
        reply: (input) => adapter.reply(input),
        defer: (input) => adapter.deferReply(input),
      }

      const result = await runWithMiddleware({
        ctx,
        middleware: getMiddleware(command),
        execute: (nextCtx) => command.execute(nextCtx),
        reportError,
        errorContext: { phase: 'command', kind: 'userCommand', id: adapter.commandName },
        replyUserError: (input) => adapter.reply(input),
      })
      const durationMs = getDurationMs(startedAt)
      if (result.outcome === 'error') onEvent({ type: 'command.failed', route, durationMs })
      onEvent({ type: 'command.finished', route, durationMs, outcome: result.outcome })
    } catch (error) {
      const durationMs = getDurationMs(startedAt)
      onEvent({ type: 'command.failed', route, durationMs })
      onEvent({ type: 'command.finished', route, durationMs, outcome: 'error' })
      throw error
    }
  }

  async function dispatchMessageCommand(
    adapter: MessageCommandInteractionAdapter,
    deps: DispatchDeps<TServices>,
  ): Promise<void> {
    const command = messageCommandRegistry.get(`messageCommand:${adapter.commandName}`)
    if (!command) return
    const startedAt = Date.now()
    const route = adapter.commandName
    onEvent({ type: 'command.started', route })

    try {
      const ctx: MessageCommandContext<TServices> = {
        services: deps.services,
        stores: getStores(deps),
        targetMessage: adapter.targetMessage,
        ...getIdentity(adapter),
        reply: (input) => adapter.reply(input),
        defer: (input) => adapter.deferReply(input),
      }

      const result = await runWithMiddleware({
        ctx,
        middleware: getMiddleware(command),
        execute: (nextCtx) => command.execute(nextCtx),
        reportError,
        errorContext: { phase: 'command', kind: 'messageCommand', id: adapter.commandName },
        replyUserError: (input) => adapter.reply(input),
      })
      const durationMs = getDurationMs(startedAt)
      if (result.outcome === 'error') onEvent({ type: 'command.failed', route, durationMs })
      onEvent({ type: 'command.finished', route, durationMs, outcome: result.outcome })
    } catch (error) {
      const durationMs = getDurationMs(startedAt)
      onEvent({ type: 'command.failed', route, durationMs })
      onEvent({ type: 'command.finished', route, durationMs, outcome: 'error' })
      throw error
    }
  }

  return {
    async dispatch(adapter, deps) {
      switch (adapter.kind) {
        case 'command':
          await dispatchCommand(adapter, deps)
          return
        case 'autocomplete':
          await dispatchAutocomplete(adapter, deps)
          return
        case 'userCommand':
          await dispatchUserCommand(adapter, deps)
          return
        case 'messageCommand':
          await dispatchMessageCommand(adapter, deps)
          return
        case 'button':
        case 'select':
        case 'modal':
          await handleComponent(adapter, {
            registry: componentRegistry,
            secret: options.secret,
            deps,
            stores: getStores(deps),
            components,
            middleware: globalMiddleware,
            reportError,
            onEvent,
          })
      }
    },
  }
}
