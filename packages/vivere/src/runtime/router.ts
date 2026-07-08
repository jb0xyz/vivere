import type { ButtonDefinition, CommandDefinition } from '../authoring/create-vivere.js'
import type { CommandContext } from '../authoring/types.js'
import type { ComponentRegistry } from '../components/component-handler.js'
import { getComponentRegistryKey, handleComponent } from '../components/component-handler.js'
import { createComponentsBuilder } from '../components/component-builder.js'
import { createRegistry } from '../internal/collections.js'
import type { ErrorReporter } from '../internal/errors.js'
import { reportError as defaultReportError } from '../internal/errors.js'
import type { ChatInputInteractionAdapter, InteractionAdapter } from './interaction-adapter.js'

export interface DispatchDeps<TServices> {
  services: TServices
}

export interface CreateRouterOptions<TServices> {
  commands: CommandDefinition<TServices>[]
  buttons: ButtonDefinition<TServices>[]
  secret: string
  reportError?: ErrorReporter
}

export interface InteractionRouter<TServices = unknown> {
  dispatch(adapter: InteractionAdapter, deps: DispatchDeps<TServices>): Promise<void>
}

export function createRouter<TServices>(options: CreateRouterOptions<TServices>): InteractionRouter<TServices> {
  const commandRegistry = createRegistry(options.commands, (command) => command.descriptor.name)
  const componentRegistry: ComponentRegistry<TServices> = createRegistry(options.buttons, (button) =>
    getComponentRegistryKey(button.descriptor.componentKind, button.descriptor.id),
  )
  const components = createComponentsBuilder(options.secret)
  const reportError = options.reportError ?? defaultReportError

  async function dispatchCommand(adapter: ChatInputInteractionAdapter, deps: DispatchDeps<TServices>): Promise<void> {
    const command = commandRegistry.get(adapter.commandName)
    if (!command) return

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
    }
    try {
      await command.execute(ctx)
    } catch (error) {
      reportError(error, { phase: 'command', id: adapter.commandName })
    }
  }

  return {
    async dispatch(adapter, deps) {
      switch (adapter.kind) {
        case 'command':
          await dispatchCommand(adapter, deps)
          return
        case 'button':
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
