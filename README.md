[**English**](./README.md) · [한국어](./README.ko.md) · [日本語](./README.ja.md)

# Vivere

Vivere is a TypeScript framework for Discord bots where one slash command lives in one typed file, and the framework handles registration, routing, and execution on top of [discord.js](https://discord.js.org).

It is meant for bots that are written as code. A command defines its name, description, options, and handler in one place. Vivere reads that definition and gives the handler a typed context, so command files stay small without a central switch statement or repeated interaction boilerplate.

Vivere is MIT licensed and lives at [github.com/jb0xyz/vivere](https://github.com/jb0xyz/vivere). The package name is `vivere`, but it has not been published to npm yet.

## What It Looks Like

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

Start the bot from your own entry file:

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

Options are typed from their declaration:

```ts
import { defineCommand, opt } from '../app/vivere.js'

export const inspectCommand = defineCommand({
  name: 'inspect',
  description: 'Shows member information',
  options: {
    target: opt.user('The member'),
    silent: opt.boolean('Reply quietly').optional(),
  },
  async execute(ctx) {
    ctx.options.target
    ctx.options.silent

    await ctx.reply({
      content: `Selected ${ctx.options.target.username}`,
      ephemeral: ctx.options.silent,
    })
  },
})
```

In that handler, `ctx.options.target` is a `User`, and `ctx.options.silent` is `boolean | undefined`.

Services are bound once:

```ts
// src/app/vivere.ts
import { createVivere } from 'vivere'
import type { ServicesType } from './services.js'

export const vivere = createVivere<ServicesType>()

export const defineCommand = vivere.defineCommand
export const opt = vivere.opt
```

Every command created through that file receives the same typed `ctx.services`.

## Run The Example

Vivere is not on npm yet. Run it from the repository:

```sh
git clone https://github.com/jb0xyz/vivere.git
cd vivere
pnpm install
pnpm --filter vivere build
cd examples/basic-bot
cp .env.example .env
pnpm start
```

Fill `.env` with your Discord bot token and development guild ID before starting the example.

## Bot Structure

A small bot can be organized like this:

```txt
src/
  app/
    services.ts
    vivere.ts
  commands/
    ping.ts
  index.ts
```

Commands are registered by passing them to `createApp({ commands: [...] })`, so the wiring stays visible in one place.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

MIT. See [LICENSE](./LICENSE).
