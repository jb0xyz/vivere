import { createHmac } from 'node:crypto'
import { resolve } from 'node:path'
import { Client } from 'discord.js'
import type { ApplicationCommandDataResolvable, GatewayIntentBits } from 'discord.js'
import type { ButtonDefinition, CommandDefinition, EventDefinition } from '../authoring/create-vivere.js'
import type { DiscoverOptions } from '../discovery/discover.js'
import { discoverButtons, discoverCommands, discoverEvents } from '../discovery/discover.js'
import { handleInteraction } from '../discord/client.js'
import { toCommandJSON } from '../discord/to-command-json.js'
import { registerEvents } from './events.js'
import { createRouter } from './router.js'

export interface AppConfig {
  token: string
  intents: GatewayIntentBits[]
  devGuildId?: string
}

export interface AppDiscoveryConfig {
  commands?: string
  events?: string
  components?: string
}

export interface CreateAppOptions<TServices> {
  config: AppConfig
  createServices: () => Promise<TServices>
  commands?: CommandDefinition<TServices>[]
  buttons?: ButtonDefinition<TServices>[]
  events?: EventDefinition<TServices>[]
  discover?: AppDiscoveryConfig
}

export interface ResolveDefinitionsInput<TServices> {
  cwd: string
  commands?: CommandDefinition<TServices>[]
  buttons?: ButtonDefinition<TServices>[]
  events?: EventDefinition<TServices>[]
  discover?: AppDiscoveryConfig
}

export interface ResolvedDefinitions<TServices> {
  commands: CommandDefinition<TServices>[]
  events: EventDefinition<TServices>[]
  buttons: ButtonDefinition<TServices>[]
}

export interface App {
  start(): Promise<void>
}

function assertUnique(items: readonly string[], label: string): void {
  const seen = new Set<string>()
  for (const item of items) {
    if (seen.has(item)) throw new Error(`Duplicate ${label} "${item}"`)
    seen.add(item)
  }
}

export async function resolveDefinitions<TServices>(
  input: ResolveDefinitionsInput<TServices>,
  importer?: DiscoverOptions['import'],
): Promise<ResolvedDefinitions<TServices>> {
  const discoverOptions = importer ? { import: importer } : undefined
  const discoveredCommands = input.discover?.commands
    ? await discoverCommands<TServices>(resolve(input.cwd, input.discover.commands), discoverOptions)
    : []
  const discoveredEvents = input.discover?.events
    ? await discoverEvents<TServices>(resolve(input.cwd, input.discover.events), discoverOptions)
    : []
  const discoveredButtons = input.discover?.components
    ? await discoverButtons<TServices>(resolve(input.cwd, input.discover.components), discoverOptions)
    : []
  const commands = [...(input.commands ?? []), ...discoveredCommands]
  const events = [...(input.events ?? []), ...discoveredEvents]
  const buttons = [...(input.buttons ?? []), ...discoveredButtons]

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

export function createApp<TServices>(options: CreateAppOptions<TServices>): App {
  const { config, createServices } = options
  if (!config.token) {
    throw new Error('createApp: config.token is required (set your bot token, e.g. via DISCORD_TOKEN).')
  }
  const secret = createHmac('sha256', config.token).update('vivere:component-custom-id').digest('base64url')
  const client = new Client({ intents: config.intents })

  return {
    async start() {
      const definitions = await resolveDefinitions({
        cwd: process.cwd(),
        commands: options.commands,
        events: options.events,
        buttons: options.buttons,
        discover: options.discover,
      })
      const router = createRouter({
        commands: definitions.commands,
        buttons: definitions.buttons,
        secret,
      })
      registerEvents(client, definitions.events, createServices)
      client.on('interactionCreate', (interaction) => {
        void handleInteraction(interaction, router, createServices).catch((error: unknown) => {
          // Route this through app-level onError when that API exists.
          console.error(error)
        })
      })
      const readyPromise = new Promise<void>((resolve, reject) => {
        client.once('ready', (ready) => {
          if (!config.devGuildId) {
            resolve()
            return
          }

          ready.application.commands
            .set(
              definitions.commands.map((command) => toCommandJSON(command.descriptor)) as ApplicationCommandDataResolvable[],
              config.devGuildId,
            )
            .then(() => resolve())
            .catch((error: unknown) => reject(error))
        })
      })

      await client.login(config.token)
      await readyPromise
    },
  }
}
