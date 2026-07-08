import type {
  ApplicationCommandDefinition,
  ButtonDefinition,
  CommandDefinition,
  ComponentDefinition,
  MessageCommandDefinition,
  UserCommandDefinition,
} from '../authoring/create-vivere.js'
import type { CommandContext, MessageCommandContext, UserCommandContext } from '../authoring/types.js'
import type { ComponentRegistry } from '../components/component-handler.js'
import { getComponentRegistryKey, handleComponent } from '../components/component-handler.js'
import { createComponentsBuilder, createModalSpec } from '../components/component-builder.js'
import { getApplicationCommandKey } from '../internal/application-command-key.js'
import { createRegistry } from '../internal/collections.js'
import type { ErrorReporter } from '../internal/errors.js'
import { reportError as defaultReportError } from '../internal/errors.js'
import type {
  AutocompleteInteractionAdapter,
  ChatInputInteractionAdapter,
  InteractionAdapter,
  MessageCommandInteractionAdapter,
  UserCommandInteractionAdapter,
} from './interaction-adapter.js'

export interface DispatchDeps<TServices> {
  services: TServices
}

export interface CreateRouterOptions<TServices> {
  commands: ApplicationCommandDefinition<TServices>[]
  buttons?: ButtonDefinition<TServices>[]
  components?: ComponentDefinition<TServices>[]
  secret: string
  reportError?: ErrorReporter
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

  async function dispatchCommand(adapter: ChatInputInteractionAdapter, deps: DispatchDeps<TServices>): Promise<void> {
    const route = adapter.route.length > 0 ? adapter.route : [adapter.commandName]
    const command = commandRegistry.get(route.join('/'))
    if (!command?.execute) return

    const resolvedOptions: Record<string, unknown> = {}
    for (const option of command.descriptor.options) {
      resolvedOptions[option.property] = adapter.getOption(option.name, option.kind, option.required)
    }

    const ctx: CommandContext<Record<string, unknown>, TServices> = {
      options: resolvedOptions,
      services: deps.services,
      components,
      reply: (input) => adapter.reply(input),
      defer: (input) => adapter.deferReply(input),
      showModal: (modal, input) => adapter.showModal(createModalSpec(options.secret, modal, input)),
    }
    try {
      await command.execute(ctx)
    } catch (error) {
      reportError(error, { phase: 'command', id: route.join('/') })
    }
  }

  async function dispatchAutocomplete(
    adapter: AutocompleteInteractionAdapter,
    deps: DispatchDeps<TServices>,
  ): Promise<void> {
    const route = adapter.route.length > 0 ? adapter.route : [adapter.commandName]
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
          value: adapter.focusedValue,
        },
        adapter.focusedValue,
      )
      await adapter.respond(choices)
    } catch (error) {
      reportError(error, { phase: 'command', id: route.join('/') })
      await adapter.respond([])
    }
  }

  async function dispatchUserCommand(
    adapter: UserCommandInteractionAdapter,
    deps: DispatchDeps<TServices>,
  ): Promise<void> {
    const command = userCommandRegistry.get(`userCommand:${adapter.commandName}`)
    if (!command) return

    const ctx: UserCommandContext<TServices> = {
      services: deps.services,
      targetUser: adapter.targetUser,
      reply: (input) => adapter.reply(input),
      defer: (input) => adapter.deferReply(input),
    }

    try {
      await command.execute(ctx)
    } catch (error) {
      reportError(error, { phase: 'command', kind: 'userCommand', id: adapter.commandName })
    }
  }

  async function dispatchMessageCommand(
    adapter: MessageCommandInteractionAdapter,
    deps: DispatchDeps<TServices>,
  ): Promise<void> {
    const command = messageCommandRegistry.get(`messageCommand:${adapter.commandName}`)
    if (!command) return

    const ctx: MessageCommandContext<TServices> = {
      services: deps.services,
      targetMessage: adapter.targetMessage,
      reply: (input) => adapter.reply(input),
      defer: (input) => adapter.deferReply(input),
    }

    try {
      await command.execute(ctx)
    } catch (error) {
      reportError(error, { phase: 'command', kind: 'messageCommand', id: adapter.commandName })
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
            components,
            reportError,
          })
      }
    },
  }
}
