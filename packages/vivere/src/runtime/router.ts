import type { CommandIR } from '../authoring/create-vivere.js'
import type { CommandContext } from '../authoring/types.js'
import { toDiscordName } from '../manifest/serialize.js'
import type { ChatInputInteractionAdapter } from './interaction-adapter.js'

export interface DispatchDeps {
  services: unknown
}

export interface InteractionRouter {
  dispatch(adapter: ChatInputInteractionAdapter, deps: DispatchDeps): Promise<void>
}

export function createRouter(commands: CommandIR[]): InteractionRouter {
  const registry = new Map(commands.map((c) => [c.name, c] as const))
  return {
    async dispatch(adapter, deps) {
      const command = registry.get(adapter.commandName)
      if (!command) return

      const options: Record<string, unknown> = {}
      for (const [key, node] of Object.entries(command.options)) {
        options[key] = adapter.getOption(toDiscordName(key), node.kind)
      }

      const ctx: CommandContext<Record<string, unknown>, unknown> = {
        options,
        services: deps.services,
        reply: (input) => adapter.reply(input),
        defer: (input) => adapter.deferReply(input),
      }
      await command.execute(ctx)
    },
  }
}
