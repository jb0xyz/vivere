# Vivere

A TypeScript framework for building Discord bots that stay readable as they grow.

**English** · [한국어](./README.ko.md) · [日本語](./README.ja.md)

---

Most Discord bots begin as a single file and slowly turn into a tangle of command
registrations, option parsing, permission checks, and button handlers. Vivere is an
effort to keep that from happening. It gives you a small set of typed building blocks
and a predictable file layout, so a bot with two commands and a bot with two hundred
are organized the same way.

It is built on top of [discord.js](https://discord.js.org), so you keep the entire
ecosystem and can always reach for the raw client when you need it.

## Why Vivere

- **Everything is typed.** Declare a command's options once and `ctx.options` is
  inferred for you — no casts, no guesswork.
- **A structure you can predict.** A command lives in `src/commands/ping.ts` and
  becomes `/ping`. Where a file sits tells you what it is.
- **No hidden magic.** Your bot boots from an entry file you can read top to bottom.
  File discovery is a convenience, not a requirement — you can register everything
  explicitly.
- **Small pieces.** Each command is a self-contained file, so it is easy to find,
  read, and change.

## A quick look

```ts
// src/commands/ping.ts
import { defineCommand } from '../app/vivere.js'

export const pingCommand = defineCommand({
  name: 'ping',
  description: 'Replies with Pong',
  async execute(ctx) {
    await ctx.reply('Pong!')
  },
})
```

```ts
// src/index.ts
import { GatewayIntentBits, createApp } from 'vivere'
import { createServices } from './app/services.js'
import { pingCommand } from './commands/ping.js'

const app = createApp({
  config: {
    token: process.env.DISCORD_TOKEN!,
    intents: [GatewayIntentBits.Guilds],
    devGuildId: process.env.DEV_GUILD_ID,
  },
  createServices,
  commands: [pingCommand],
})

await app.start()
```

Options are declared inline, and their types flow straight through to `execute`:

```ts
options: {
  target: opt.user('The member to assign'),
  silent: opt.boolean('Reply quietly').optional(),
},
// inside execute, ctx.options is fully typed:
//   ctx.options.target → User
//   ctx.options.silent → boolean | undefined
```

## Getting started

Vivere is in early development and is not published to npm yet. To try it, clone the
repository and run the example bot:

```bash
git clone https://github.com/jb0xyz/vivere.git
cd vivere
pnpm install
pnpm --filter vivere build

cd examples/basic-bot
cp .env.example .env   # add your bot token and a development guild id
pnpm start
```

Invite the bot to your development server and run `/ping`.

## How a bot is laid out

```
basic-bot/
├─ src/
│  ├─ app/
│  │  ├─ vivere.ts     # createVivere<Services>() — your typed entry points
│  │  └─ services.ts   # shared services handed to every command
│  ├─ commands/
│  │  └─ ping.ts       # one file per command
│  └─ index.ts         # createApp(...).start()
└─ package.json
```

`createVivere<Services>()` binds your service types once, so every command receives a
fully typed `ctx.services` without any global wiring.

## Contributing

Issues and pull requests are welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md) for how
to set up the project and propose changes.

## License

Released under the [MIT License](./LICENSE).
