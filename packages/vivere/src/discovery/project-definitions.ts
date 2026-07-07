import { resolve } from 'node:path'
import type { ButtonDefinition, CommandDefinition, EventDefinition } from '../authoring/create-vivere.js'
import { assertUnique } from '../internal/collections.js'
import type { DiscoverOptions } from './discover.js'
import { discoverButtons, discoverCommands, discoverEvents } from './discover.js'

export interface ProjectDiscoveryConfig {
  commands?: string
  events?: string
  components?: string
}

export interface ExplicitDefinitions<TServices> {
  commands?: CommandDefinition<TServices>[]
  events?: EventDefinition<TServices>[]
  buttons?: ButtonDefinition<TServices>[]
}

export interface ProjectDefinitions<TServices> {
  commands: CommandDefinition<TServices>[]
  events: EventDefinition<TServices>[]
  buttons: ButtonDefinition<TServices>[]
}

export interface ResolveProjectDefinitionsInput<TServices> {
  baseDir: string
  discovery?: ProjectDiscoveryConfig
  explicit?: ExplicitDefinitions<TServices>
  importer?: DiscoverOptions['import']
}

export async function resolveProjectDefinitions<TServices>(
  input: ResolveProjectDefinitionsInput<TServices>,
): Promise<ProjectDefinitions<TServices>> {
  const discoverOptions = input.importer ? { import: input.importer } : undefined
  const discoveredCommands = input.discovery?.commands
    ? await discoverCommands<TServices>(resolve(input.baseDir, input.discovery.commands), discoverOptions)
    : []
  const discoveredEvents = input.discovery?.events
    ? await discoverEvents<TServices>(resolve(input.baseDir, input.discovery.events), discoverOptions)
    : []
  const discoveredButtons = input.discovery?.components
    ? await discoverButtons<TServices>(resolve(input.baseDir, input.discovery.components), discoverOptions)
    : []
  const commands = [...(input.explicit?.commands ?? []), ...discoveredCommands]
  const events = [...(input.explicit?.events ?? []), ...discoveredEvents]
  const buttons = [...(input.explicit?.buttons ?? []), ...discoveredButtons]

  assertUnique(
    commands.map((command) => command.descriptor.name),
    'command name',
  )
  assertUnique(
    buttons.map((button) => button.descriptor.id),
    'button id',
  )

  return { commands, events, buttons }
}
