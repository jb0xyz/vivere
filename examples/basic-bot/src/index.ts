import { GatewayIntentBits, createApp } from 'vivere'
import { createServices } from './app/services.js'

const app = createApp({
  config: {
    token: process.env.DISCORD_TOKEN!,
    intents: [GatewayIntentBits.Guilds],
    devGuildId: process.env.DEV_GUILD_ID,
  },
  createServices,
  discover: {
    commands: 'src/commands',
    events: 'src/events',
    components: 'src/components',
  },
})

await app.start()
