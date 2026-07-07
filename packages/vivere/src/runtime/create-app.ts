import { Client } from 'discord.js'
import type { ApplicationCommandDataResolvable, GatewayIntentBits } from 'discord.js'
import type { CommandIR, EventIR } from '../authoring/create-vivere.js'
import { handleInteraction } from '../discord/client.js'
import { toCommandJSON } from '../discord/to-command-json.js'
import { registerEvents } from './events.js'
import { createRouter } from './router.js'

export interface AppConfig {
  token: string
  intents: GatewayIntentBits[]
  devGuildId?: string
}

export interface CreateAppOptions<TServices> {
  config: AppConfig
  createServices: () => Promise<TServices>
  commands: CommandIR<TServices>[]
  events?: EventIR<TServices>[]
}

export interface App {
  start(): Promise<void>
}

export function createApp<TServices>(options: CreateAppOptions<TServices>): App {
  const { config, createServices, commands, events = [] } = options
  const router = createRouter(commands)
  const client = new Client({ intents: config.intents })

  registerEvents(client, events, createServices)

  client.on('interactionCreate', (interaction) => {
    void handleInteraction(interaction, router, createServices).catch((error: unknown) => {
      // Route this through app-level onError when that API exists.
      console.error(error)
    })
  })

  return {
    async start() {
      const readyPromise = new Promise<void>((resolve, reject) => {
        client.once('ready', (ready) => {
          if (!config.devGuildId) {
            resolve()
            return
          }

          ready.application.commands
            .set(commands.map(toCommandJSON) as ApplicationCommandDataResolvable[], config.devGuildId)
            .then(() => resolve())
            .catch((error: unknown) => reject(error))
        })
      })

      await client.login(config.token)
      await readyPromise
    },
  }
}
