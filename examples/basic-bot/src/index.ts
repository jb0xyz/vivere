import { GatewayIntentBits, createApp } from '@jb0xyz/vivere'
import { createServices } from './app/services.js'
import config from '../vivere.config.js'

const app = createApp({
  config: {
    token: process.env.DISCORD_TOKEN!,
    intents: [GatewayIntentBits.Guilds],
    devGuildId: process.env.DEV_GUILD_ID,
  },
  createServices,
  discover: config.discovery,
  plugins: config.plugins,
})

await app.start()
