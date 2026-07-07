import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js'
import type { ButtonDefinition, CommandDefinition } from '../authoring/create-vivere.js'
import type { ParamDescriptor } from '../authoring/ir.js'
import type { CommandContext } from '../authoring/types.js'
import type { ButtonDefinitionForParams } from '../authoring/types.js'
import type { ButtonStyleName, ComponentsBuilder } from '../authoring/types.js'
import type { ComponentRegistry } from '../components/component-handler.js'
import { getComponentRegistryKey, handleComponent } from '../components/component-handler.js'
import { encodeCustomId } from '../components/custom-id.js'
import { createRegistry } from '../internal/collections.js'
import type { ChatInputInteractionAdapter, InteractionAdapter } from './interaction-adapter.js'

export interface DispatchDeps<TServices> {
  services: TServices
}

export interface CreateRouterOptions<TServices> {
  commands: CommandDefinition<TServices>[]
  buttons: ButtonDefinition<TServices>[]
  secret: string
}

export interface InteractionRouter<TServices = unknown> {
  dispatch(adapter: InteractionAdapter, deps: DispatchDeps<TServices>): Promise<void>
}

const BUTTON_STYLE = {
  primary: ButtonStyle.Primary,
  secondary: ButtonStyle.Secondary,
  success: ButtonStyle.Success,
  danger: ButtonStyle.Danger,
} satisfies Record<ButtonStyleName, ButtonStyle>

function encodeButtonParam(param: ParamDescriptor, value: unknown): string {
  switch (param.kind) {
    case 'snowflake':
      if (typeof value !== 'string' || !/^\d{17,20}$/.test(value)) throw new Error(`Invalid snowflake param: ${value}`)
      return value
    case 'string':
      if (typeof value !== 'string') throw new Error(`Invalid string param: ${value}`)
      if (param.maxLength !== undefined && value.length > param.maxLength) {
        throw new Error(`String param exceeds max length ${param.maxLength}`)
      }
      return value
    case 'boolean':
      if (typeof value !== 'boolean') throw new Error(`Invalid boolean param: ${value}`)
      return value ? 'true' : 'false'
    case 'enum':
      if (typeof value !== 'string' || !param.values?.includes(value)) throw new Error(`Invalid enum param: ${value}`)
      return value
  }
}

function encodeButtonParams(
  button: ButtonDefinitionForParams<Record<string, unknown>>,
  params: Record<string, unknown>,
): Record<string, string> {
  const encodedParams: Record<string, string> = {}
  for (const param of button.descriptor.params) {
    encodedParams[param.name] = encodeButtonParam(param, params[param.name])
  }
  return encodedParams
}

function createComponentsBuilder(secret: string): ComponentsBuilder {
  return {
    button(button, options) {
      const customId = encodeCustomId(
        button.descriptor.componentKind,
        button.descriptor.id,
        encodeButtonParams(button, options.params),
        secret,
      )
      const builder = new ButtonBuilder()
        .setCustomId(customId)
        .setLabel(options.label)
        .setStyle(BUTTON_STYLE[options.style ?? 'primary'])

      return new ActionRowBuilder<ButtonBuilder>().addComponents(builder)
    },
  }
}

export function createRouter<TServices>(options: CreateRouterOptions<TServices>): InteractionRouter<TServices> {
  const commandRegistry = createRegistry(options.commands, (command) => command.descriptor.name)
  const componentRegistry: ComponentRegistry<TServices> = createRegistry(options.buttons, (button) =>
    getComponentRegistryKey(button.descriptor.componentKind, button.descriptor.id),
  )
  const components = createComponentsBuilder(options.secret)

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
    await command.execute(ctx)
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
          })
      }
    },
  }
}
