import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js'
import type { ButtonIR, CommandIR } from '../authoring/create-vivere.js'
import type { InferParams, ParamsRecord } from '../authoring/param.js'
import type { CommandContext } from '../authoring/types.js'
import type { ButtonStyleName, ComponentsBuilder } from '../authoring/types.js'
import { decodeCustomId, encodeCustomId } from '../components/custom-id.js'
import { toDiscordName } from '../manifest/serialize.js'
import type { ButtonInteractionAdapter, ChatInputInteractionAdapter } from './interaction-adapter.js'

export interface DispatchDeps<TServices> {
  services: TServices
}

export interface CreateRouterOptions<TServices> {
  commands: CommandIR<TServices>[]
  buttons: ButtonIR<TServices>[]
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

function encodeButtonParams<TServices, TParams extends ParamsRecord>(
  button: ButtonIR<TServices, TParams>,
  params: InferParams<TParams>,
): Record<string, string> {
  const encodedParams: Record<string, string> = {}
  for (const [key, node] of Object.entries(button.params)) {
    encodedParams[key] = node.encode(params[key as keyof InferParams<TParams>])
  }
  return encodedParams
}

function createComponentsBuilder(secret: string): ComponentsBuilder {
  return {
    button(button, options) {
      const customId = encodeCustomId(button.id, encodeButtonParams(button, options.params), secret)
      const builder = new ButtonBuilder()
        .setCustomId(customId)
        .setLabel(options.label)
        .setStyle(BUTTON_STYLE[options.style ?? 'primary'])

      return new ActionRowBuilder<ButtonBuilder>().addComponents(builder)
    },
  }
}

export function createRouter<TServices>(options: CreateRouterOptions<TServices>): InteractionRouter<TServices> {
  const commandRegistry = new Map(options.commands.map((c) => [c.name, c] as const))
  const buttonRegistry = new Map(options.buttons.map((b) => [b.id, b] as const))
  const components = createComponentsBuilder(options.secret)

  return {
    async dispatchCommand(adapter, deps) {
      const command = commandRegistry.get(adapter.commandName)
      if (!command) return

      const options: Record<string, unknown> = {}
      for (const [key, node] of Object.entries(command.options)) {
        options[key] = adapter.getOption(toDiscordName(key), node.kind, node.presence === 'required')
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
        for (const [key, node] of Object.entries(button.params)) {
          const raw = decoded.params[key]
          if (raw === undefined) throw new Error(`Missing button param: ${key}`)
          params[key] = node.decode(raw)
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
