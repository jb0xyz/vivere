# @jb0xyz/vivere

A TypeScript framework for building Discord bots on top of [discord.js](https://discord.js.org). Commands, events, and components are written as typed files; Vivere discovers, registers, and routes them.

## Install

```sh
npm install @jb0xyz/vivere
```

## Example

```ts
// src/commands/ping.ts -> /ping
import { defineCommand } from '../app/vivere.js'

export default defineCommand({
  name: 'ping',
  description: 'Replies with Pong',
  async execute(ctx) {
    await ctx.reply('Pong!')
  },
})
```

Slash commands with typed options, autocomplete, and folder-based subcommands, plus events, buttons, string select menus, and modals are all written as small typed files. The `vivere build` CLI produces a deterministic manifest, and `vivere sync` registers commands with Discord.

Full documentation, more examples, and the source are at **[github.com/jb0xyz/vivere](https://github.com/jb0xyz/vivere)**.

## License

MIT — see [LICENSE](./LICENSE).
