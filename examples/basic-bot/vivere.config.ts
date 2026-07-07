import { defineConfig } from 'vivere'

export default defineConfig({
  discovery: {
    commands: 'src/commands',
    events: 'src/events',
    components: 'src/components',
  },
  devGuildId: process.env.DEV_GUILD_ID,
})
