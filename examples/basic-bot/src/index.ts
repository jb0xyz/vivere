import { GatewayIntentBits, createApp } from 'vivere'
import { createServices } from './app/services.js'
import { askCommand } from './commands/ask.js'
import { pingCommand } from './commands/ping.js'
import { confirmButton } from './components/confirm.js'
import { readyEvent } from './events/ready.js'

const app = createApp({
  config: {
    token: process.env.DISCORD_TOKEN!,
    intents: [GatewayIntentBits.Guilds],
    devGuildId: process.env.DEV_GUILD_ID,
  },
  createServices,
  commands: [pingCommand, askCommand],
  buttons: [confirmButton],
  events: [readyEvent],
})

await app.start()
