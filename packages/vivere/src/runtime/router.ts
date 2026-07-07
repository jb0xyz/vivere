import type { CommandIR } from '../authoring/create-vivere.js'
import type { CommandContext } from '../authoring/types.js'
import { toDiscordName } from '../manifest/serialize.js'
import type { ChatInputInteractionAdapter } from './interaction-adapter.js'

export interface DispatchDeps<TServices> {
  services: TServices
}

export interface InteractionRouter<TServices = unknown> {
  dispatch(adapter: ChatInputInteractionAdapter, deps: DispatchDeps<TServices>): Promise<void>
}

export function createRouter<TServices>(commands: CommandIR<TServices>[]): InteractionRouter<TServices> {
  const registry = new Map(commands.map((c) => [c.name, c] as const))
  return {
    async dispatch(adapter, deps) {
      const command = registry.get(adapter.commandName)
      if (!command) return

      const options: Record<string, unknown> = {}
      for (const [key, node] of Object.entries(command.options)) {
        options[key] = adapter.getOption(toDiscordName(key), node.kind, node.presence === 'required')
      }

      const ctx: CommandContext<Record<string, unknown>, TServices> = {
        options,
        services: deps.services,
        reply: (input) => adapter.reply(input),
        defer: (input) => adapter.deferReply(input),
      }
      await command.execute(ctx)
    },
  }
}
