import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js'
import type { ButtonDefinition, CommandDefinition } from '../authoring/create-vivere.js'
import type { ParamDescriptor } from '../authoring/ir.js'
import type { CommandContext } from '../authoring/types.js'
import type { ButtonDefinitionForParams } from '../authoring/types.js'
import type { ButtonStyleName, ComponentsBuilder } from '../authoring/types.js'
import { decodeCustomId, encodeCustomId } from '../components/custom-id.js'
import { createRegistry } from '../internal/collections.js'
import type { ButtonInteractionAdapter, ChatInputInteractionAdapter } from './interaction-adapter.js'

export interface DispatchDeps<TServices> {
  services: TServices
}

export interface CreateRouterOptions<TServices> {
  commands: CommandDefinition<TServices>[]
  buttons: ButtonDefinition<TServices>[]
  secret: string
}

export interface InteractionRouter<TServices = unknown> {
  dispatchCommand(adapter: ChatInputInteractionAdapter, deps: DispatchDeps<TServices>): Promise<void>
  dispatchButton(adapter: ButtonInteractionAdapter, deps: DispatchDeps<TServices>): Promise<void>
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
      const customId = encodeCustomId(button.descriptor.id, encodeButtonParams(button, options.params), secret)
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
  const buttonRegistry = createRegistry(options.buttons, (button) => button.descriptor.id)
  const components = createComponentsBuilder(options.secret)

  return {
    async dispatchCommand(adapter, deps) {
      const command = commandRegistry.get(adapter.commandName)
      if (!command) return

      const options: Record<string, unknown> = {}
      for (const option of command.descriptor.options) {
        options[option.property] = adapter.getOption(option.name, option.kind, option.required)
      }

      const ctx: CommandContext<Record<string, unknown>, TServices> = {
        options,
        services: deps.services,
        components,
        reply: (input) => adapter.reply(input),
        defer: (input) => adapter.deferReply(input),
      }
      await command.execute(ctx)
    },
    async dispatchButton(adapter, deps) {
      let decoded: { id: string; params: Record<string, string> }
      try {
        decoded = decodeCustomId(adapter.customId, options.secret)
      } catch (error) {
        console.warn(error)
        return
      }

      const button = buttonRegistry.get(decoded.id)
      if (!button) {
        console.warn(`Unknown button customId: ${decoded.id}`)
        return
      }

      const params: Record<string, unknown> = {}
      try {
        for (const [key, codec] of Object.entries(button.codecs)) {
          const raw = decoded.params[key]
          if (raw === undefined) throw new Error(`Missing button param: ${key}`)
          params[key] = codec.decode(raw)
        }
      } catch (error) {
        console.warn(error)
        return
      }

      await button.execute({
        params,
        services: deps.services,
        update: (input) => adapter.update(input),
        reply: (input) => adapter.reply(input),
        defer: () => adapter.deferUpdate(),
      })
    },
  }
}
