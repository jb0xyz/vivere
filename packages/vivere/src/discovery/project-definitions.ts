import { resolve } from 'node:path'
import type {
  ButtonDefinition,
  CommandDefinition,
  ComponentDefinition,
  EventDefinition,
  PluginDefinition,
} from '../authoring/create-vivere.js'
import { assertUnique } from '../internal/collections.js'
import type { DiscoverOptions } from './discover.js'
import { discoverComponents, discoverCommands, discoverEvents } from './discover.js'

export interface ProjectDiscoveryConfig {
  commands?: string
  events?: string
  components?: string
}

export interface ExplicitDefinitions<TServices> {
  commands?: CommandDefinition<TServices>[]
  events?: EventDefinition<TServices>[]
  buttons?: ButtonDefinition<TServices>[]
  components?: ComponentDefinition<TServices>[]
}

export interface ProjectDefinitions<TServices> {
  commands: CommandDefinition<TServices>[]
  events: EventDefinition<TServices>[]
  components: ComponentDefinition<TServices>[]
  buttons: ButtonDefinition<TServices>[]
}

export interface ResolveProjectDefinitionsInput<TServices> {
  baseDir: string
  discovery?: ProjectDiscoveryConfig
  explicit?: ExplicitDefinitions<TServices>
  plugins?: PluginDefinition<TServices>[]
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
  const discoveredComponents = input.discovery?.components
    ? await discoverComponents<TServices>(resolve(input.baseDir, input.discovery.components), discoverOptions)
    : []
  const commands = [...(input.explicit?.commands ?? []), ...discoveredCommands]
  const events = [...(input.explicit?.events ?? []), ...discoveredEvents]
  const components = [
    ...(input.explicit?.buttons ?? []),
    ...(input.explicit?.components ?? []),
    ...discoveredComponents,
  ]
  for (const plugin of input.plugins ?? []) {
    commands.push(...plugin.commands)
    events.push(...plugin.events)
    components.push(...plugin.components)
  }
  const buttons = components.filter((component): component is ButtonDefinition<TServices> =>
    component.descriptor.componentKind === 'button',
  )

  assertUnique(
    commands.map((command) => command.descriptor.name),
    'command name',
  )
  assertUnique(
    components.map((component) => `${component.descriptor.componentKind}:${component.descriptor.id}`),
    'component id',
  )

  return { commands, events, components, buttons }
}
