import { Client } from 'discord.js'
import type { GatewayIntentBits } from 'discord.js'
import type { CommandIR } from '../authoring/create-vivere.js'
import { handleInteraction } from '../discord/client.js'
import { toCommandJSON } from '../discord/to-command-json.js'
import { createRouter } from './router.js'

export interface AppConfig {
  token: string
  intents: GatewayIntentBits[]
  devGuildId?: string
}

export interface CreateAppOptions {
  config: AppConfig
  createServices: () => Promise<unknown>
  commands: CommandIR[]
}

export interface App {
  start(): Promise<void>
}

export function createApp(options: CreateAppOptions): App {
  const { config, createServices, commands } = options
  const router = createRouter(commands)
  const client = new Client({ intents: config.intents })

  client.on('interactionCreate', (interaction) => {
    void handleInteraction(interaction, router, createServices)
  })

  return {
    async start() {
      client.once('ready', (ready) => {
        if (!config.devGuildId) return
        // Register commands to the development guild on startup for fast iteration.
        void ready.application.commands.set(commands.map(toCommandJSON), config.devGuildId)
      })
      await client.login(config.token)
    },
  }
}
