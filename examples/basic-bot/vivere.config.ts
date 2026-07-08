import { defineConfig } from '@jb0xyz/vivere'
import statusPlugin from './src/plugins/status.js'

export default defineConfig({
  discovery: {
    commands: 'src/commands',
    events: 'src/events',
    components: 'src/components',
  },
  devGuildId: process.env.DEV_GUILD_ID,
  plugins: [statusPlugin],
})
