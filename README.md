[**English**](./README.md) · [한국어](./README.ko.md) · [日本語](./README.ja.md)

# Vivere

[![CI](https://github.com/jb0xyz/vivere/actions/workflows/ci.yml/badge.svg)](https://github.com/jb0xyz/vivere/actions/workflows/ci.yml)

Vivere is a TypeScript framework for Discord bots where commands, events, and components are written as typed files and wired together on top of [discord.js](https://discord.js.org).

Instead of keeping a large interaction switch or a hand-written registry, you define each bot feature in its own file. Vivere discovers those files, builds a deterministic manifest, registers slash commands when asked, and routes Discord interactions to typed handlers.

Vivere is MIT licensed and lives at [github.com/jb0xyz/vivere](https://github.com/jb0xyz/vivere). The npm package is `@jb0xyz/vivere`. The current package version is `0.3.0`; it is still early, but the file-based command and component loop is already in place.

## What It Looks Like

Create one local authoring file for your service types:

```ts
// src/app/vivere.ts
import { createVivere } from '@jb0xyz/vivere'
import type { Services } from './services.js'

export const {
  defineCommand,
  defineEvent,
  defineButton,
  defineSelect,
  defineModal,
  opt,
  param,
  field,
} = createVivere<Services>()
```

A slash command is just a default export:

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

Options are declared next to the handler. Their types are inferred on `ctx.options`, and string options can provide autocomplete choices:

```ts
// src/commands/search.ts -> /search
import { defineCommand, opt } from '../app/vivere.js'

export default defineCommand({
  name: 'search',
  description: 'Search items',
  options: {
    query: opt.string('Search').autocomplete(async (ctx, value) => [
      { name: 'Apple', value: 'apple' },
    ]),
  },
  async execute(ctx) {
    await ctx.reply(`Selected ${ctx.options.query}`)
  },
})
```

Folders become slash command routes:

```txt
src/commands/admin/index.ts  -> /admin metadata
src/commands/admin/ban.ts    -> /admin ban
```

Events use the same file shape:

```ts
// src/events/ready.ts
import { defineEvent } from '../app/vivere.js'

export default defineEvent({
  name: 'ready',
  once: true,
  async execute(ctx) {
    ctx.services.logger.info('online')
  },
})
```

Components carry signed `customId` params and arrive with typed handlers:

```ts
// src/components/confirm.ts
import { defineButton, param } from '../app/vivere.js'

export default defineButton({
  id: 'confirm',
  params: { userId: param.snowflake() },
  async execute(ctx) {
    await ctx.update({ content: `ok ${ctx.params.userId}` })
  },
})
```

```ts
// src/components/feedback.ts
import { defineModal, field, param } from '../app/vivere.js'

export default defineModal({
  id: 'feedback',
  params: { userId: param.snowflake() },
  fields: {
    subject: field.short('Subject'),
    body: field.paragraph('Details'),
  },
  async execute(ctx) {
    await ctx.reply({ content: `Got: ${ctx.fields.subject}` })
  },
})
```

Open that modal from a command, button, or select menu:

```ts
await ctx.showModal(feedbackModal, {
  params: { userId: '123456789012345678' },
  title: 'Feedback',
})
```

Start the bot from your own entry file:

```ts
// src/index.ts
import { GatewayIntentBits, createApp } from '@jb0xyz/vivere'
import { createServices } from './app/services.js'
import vivereConfig from '../vivere.config.js'

const app = createApp({
  config: {
    token: process.env.DISCORD_TOKEN!,
    intents: [GatewayIntentBits.Guilds],
    devGuildId: vivereConfig.devGuildId,
  },
  createServices,
  discover: vivereConfig.discovery,
})

await app.start()
```

## Features

- Slash commands with typed options from `opt.*`.
- Autocomplete resolvers on options.
- Folder routes for subcommands and groups, such as `commands/admin/ban.ts` -> `/admin ban`.
- Discord events through `defineEvent`.
- Buttons, string select menus, and modals through `defineButton`, `defineSelect`, and `defineModal`.
- Signed component params in `customId`, decoded before the handler runs.
- Thin handler contexts: `ctx.options`, `ctx.params`, `ctx.fields`, `ctx.values`, `ctx.services`, `reply`, `defer`, `update`, and `showModal` where they apply.
- File discovery through `createApp({ discover })`.
- Deterministic `.vivere/manifest.json` output.

## CLI

Run the CLI from the workspace package:

```sh
vivere build
vivere build --check
vivere sync
vivere sync --global
```

`vivere build` writes `.vivere/manifest.json`. `vivere build --check` compares the generated manifest with the committed file and exits non-zero on drift. `vivere sync` registers commands to the configured development guild; `vivere sync --global` registers them globally.

## Install

Install the package in your bot project:

```sh
npm install @jb0xyz/vivere
# or
pnpm add @jb0xyz/vivere
```

## Run The Example

Run the basic bot from the repository:

```sh
git clone https://github.com/jb0xyz/vivere.git
cd vivere
pnpm install
pnpm --filter @jb0xyz/vivere build
cd examples/basic-bot
cp .env.example .env
pnpm start
```

Fill `.env` with your Discord bot token and development guild ID before starting the example.

## Bot Structure

A file-based bot can be organized like this:

```txt
src/
  app/
    services.ts
    vivere.ts
  commands/
    ping.ts
    search.ts
    admin/
      index.ts
      ban.ts
  events/
    ready.ts
  components/
    confirm.ts
    pick-role.ts
    feedback.ts
  index.ts
vivere.config.ts
.vivere/
  manifest.json
```

The file path gives each feature a predictable place. The definition inside the file gives Vivere the typed contract it needs to register and route it.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

MIT. See [LICENSE](./LICENSE).
