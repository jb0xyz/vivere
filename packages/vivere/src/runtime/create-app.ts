import { createHmac } from 'node:crypto'
import { Client } from 'discord.js'
import type { GatewayIntentBits } from 'discord.js'
import type {
  ButtonDefinition,
  CommandDefinition,
  ComponentDefinition,
  EventDefinition,
  PluginDefinition,
} from '../authoring/create-vivere.js'
import type { ProjectDiscoveryConfig } from '../discovery/project-definitions.js'
import { resolveProjectDefinitions } from '../discovery/project-definitions.js'
import { handleInteraction } from '../discord/gateway-adapter.js'
import { buildCommandTree } from '../discord/to-command-json.js'
import { reportError } from '../internal/errors.js'
import { registerEvents } from './events.js'
import { createRouter } from './router.js'

export interface AppConfig {
  token: string
  intents: GatewayIntentBits[]
  devGuildId?: string
}

export type AppDiscoveryConfig = ProjectDiscoveryConfig

export interface CreateAppOptions<TServices> {
  config: AppConfig
  createServices: () => Promise<TServices>
  commands?: CommandDefinition<TServices>[]
  buttons?: ButtonDefinition<TServices>[]
  components?: ComponentDefinition<TServices>[]
  events?: EventDefinition<TServices>[]
  plugins?: PluginDefinition<TServices>[]
  discover?: AppDiscoveryConfig
}

export interface ResolveDefinitionsInput<TServices> {
  cwd: string
  commands?: CommandDefinition<TServices>[]
  buttons?: ButtonDefinition<TServices>[]
  components?: ComponentDefinition<TServices>[]
  events?: EventDefinition<TServices>[]
  plugins?: PluginDefinition<TServices>[]
  discover?: AppDiscoveryConfig
}

export interface ResolvedDefinitions<TServices> {
  commands: CommandDefinition<TServices>[]
  events: EventDefinition<TServices>[]
  components: ComponentDefinition<TServices>[]
  buttons: ButtonDefinition<TServices>[]
}

export interface App {
  start(): Promise<void>
}

export async function resolveDefinitions<TServices>(
  input: ResolveDefinitionsInput<TServices>,
  importer?: (absPath: string) => Promise<unknown>,
): Promise<ResolvedDefinitions<TServices>> {
  return resolveProjectDefinitions({
    baseDir: input.cwd,
    discovery: input.discover,
    explicit: {
      commands: input.commands,
      events: input.events,
      buttons: input.buttons,
      components: input.components,
    },
    plugins: input.plugins,
    importer,
  })
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
        components: options.components,
        plugins: options.plugins,
        discover: options.discover,
      })
      const router = createRouter({
        commands: definitions.commands,
        buttons: definitions.buttons,
        components: definitions.components,
        secret,
        reportError,
      })
      registerEvents(client, definitions.events, createServices, reportError)
      client.on('interactionCreate', (interaction) => {
        void handleInteraction(interaction, router, createServices).catch((error: unknown) => {
          reportError(error, {
            phase:
              interaction.isButton() || interaction.isStringSelectMenu() || interaction.isModalSubmit()
                ? 'component'
                : 'command',
          })
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
              buildCommandTree(definitions.commands.map((command) => command.descriptor)),
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
