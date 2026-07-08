import { createHmac } from 'node:crypto'
import { Client } from 'discord.js'
import type { GatewayIntentBits } from 'discord.js'
import type {
  ApplicationCommandDefinition,
  ButtonDefinition,
  ComponentDefinition,
  EventDefinition,
  PluginDefinition,
} from '../authoring/create-vivere.js'
import type { AnyMiddlewareDefinition } from '../authoring/middleware.js'
import type { ProjectDiscoveryConfig } from '../discovery/project-definitions.js'
import { resolveProjectDefinitions } from '../discovery/project-definitions.js'
import { handleInteraction } from '../discord/gateway-adapter.js'
import { buildCommandTree } from '../discord/to-command-json.js'
import type { ErrorReporter } from '../internal/errors.js'
import { reportError as defaultReportError } from '../internal/errors.js'
import { ignoreVivereEvent } from '../internal/observability.js'
import type { VivereEventSink } from '../internal/observability.js'
import { createStorePorts } from '../stores/memory.js'
import type { StoreInput } from '../stores/types.js'
import { registerEvents } from './events.js'
import { createServiceLifecycle } from './lifecycle.js'
import type { ServiceFactory } from './lifecycle.js'
import { createRouter } from './router.js'

export interface AppConfig {
  token: string
  intents: GatewayIntentBits[]
  devGuildId?: string
}

export type AppDiscoveryConfig = ProjectDiscoveryConfig

export interface CreateAppOptions<TServices> {
  config: AppConfig
  createServices: ServiceFactory<TServices>
  commands?: ApplicationCommandDefinition<TServices>[]
  buttons?: ButtonDefinition<TServices>[]
  components?: ComponentDefinition<TServices>[]
  events?: EventDefinition<TServices>[]
  plugins?: PluginDefinition<TServices>[]
  discover?: AppDiscoveryConfig
  middleware?: AnyMiddlewareDefinition<TServices>[]
  stores?: StoreInput
  onError?: ErrorReporter
  onEvent?: VivereEventSink
}

export interface ResolveDefinitionsInput<TServices> {
  cwd: string
  commands?: ApplicationCommandDefinition<TServices>[]
  buttons?: ButtonDefinition<TServices>[]
  components?: ComponentDefinition<TServices>[]
  events?: EventDefinition<TServices>[]
  plugins?: PluginDefinition<TServices>[]
  discover?: AppDiscoveryConfig
}

export interface ResolvedDefinitions<TServices> {
  commands: ApplicationCommandDefinition<TServices>[]
  events: EventDefinition<TServices>[]
  components: ComponentDefinition<TServices>[]
  buttons: ButtonDefinition<TServices>[]
}

export interface App {
  start(): Promise<void>
  stop(): Promise<void>
}

export function createAppErrorReporter(input: { onError?: ErrorReporter }): ErrorReporter {
  return input.onError ?? defaultReportError
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
  const reportError = createAppErrorReporter({ onError: options.onError })
  const onEvent = options.onEvent ?? ignoreVivereEvent
  const stores = createStorePorts(options.stores)
  const services = createServiceLifecycle(createServices)
  const setupPluginList: PluginDefinition<TServices>[] = []

  return {
    async start() {
      for (const plugin of options.plugins ?? []) {
        await plugin.setup?.()
        setupPluginList.push(plugin)
      }
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
        middleware: options.middleware,
        secret,
        stores,
        reportError,
        onEvent,
      })
      registerEvents(client, definitions.events, services.createServices, reportError, options.middleware, stores, onEvent)
      client.on('interactionCreate', (interaction) => {
        void handleInteraction(interaction, router, services.createServices, stores).catch((error: unknown) => {
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

          const commands = buildCommandTree(definitions.commands.map((command) => command.descriptor))
          ready.application.commands
            .set(commands, config.devGuildId)
            .then(() => {
              onEvent({ type: 'sync.completed', guildId: config.devGuildId, count: commands.length })
              resolve()
            })
            .catch((error: unknown) => reject(error))
        })
      })

      await client.login(config.token)
      await readyPromise
    },
    async stop() {
      for (const plugin of [...setupPluginList].reverse()) {
        await plugin.dispose?.()
      }
      setupPluginList.length = 0
      await services.dispose()
      client.destroy()
    },
  }
}
