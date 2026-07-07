import type { CommandIR } from '../authoring/create-vivere.js'
import type { CommandContext } from '../authoring/types.js'
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
      const ctx: CommandContext<Record<string, unknown>, unknown> = {
        options: {},
        services: deps.services,
        reply: (input) => adapter.reply(input),
        defer: (input) => adapter.deferReply(input),
      }
      await command.execute(ctx)
    },
  }
}
