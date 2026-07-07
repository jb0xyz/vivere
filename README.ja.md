[English](./README.md) · [한국어](./README.ko.md) · [**日本語**](./README.ja.md)

# Vivere

[![CI](https://github.com/jb0xyz/vivere/actions/workflows/ci.yml/badge.svg)](https://github.com/jb0xyz/vivere/actions/workflows/ci.yml)

Vivere は、スラッシュコマンドを型付きの 1 ファイルとして書くと、[discord.js](https://discord.js.org) の上で登録、ルーティング、実行を引き受ける TypeScript 製 Discord ボットフレームワークです。

コードでボットを作るプロジェクト向けです。コマンドの名前、説明、オプション、実行処理を同じファイルに置くと、Vivere がその定義を読み取り、型の付いた `ctx` をハンドラーに渡します。大きな switch 文や interaction 処理の繰り返しを書かずに、ボットの構造をファイルとして見通せます。

Vivere は MIT ライセンスのオープンソースプロジェクトです。リポジトリは [github.com/jb0xyz/vivere](https://github.com/jb0xyz/vivere) にあります。パッケージ名は `vivere` ですが、まだ npm には公開されていません。

## コード例

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

ボットは自分のエントリーファイルから起動します。

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

オプションの型は宣言から推論されます。

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

このハンドラーでは、`ctx.options.target` は `User`、`ctx.options.silent` は `boolean | undefined` になります。

サービスの型は一度だけ結び付けます。

```ts
// src/app/vivere.ts
import { createVivere } from 'vivere'
import type { ServicesType } from './services.js'

export const vivere = createVivere<ServicesType>()

export const defineCommand = vivere.defineCommand
export const opt = vivere.opt
```

このファイル経由で作ったすべてのコマンドには、同じ型の `ctx.services` が渡されます。

## サンプルを動かす

Vivere はまだ npm に公開されていません。リポジトリから実行します。

```sh
git clone https://github.com/jb0xyz/vivere.git
cd vivere
pnpm install
pnpm --filter vivere build
cd examples/basic-bot
cp .env.example .env
pnpm start
```

サンプルを起動する前に、`.env` に Discord ボットトークンと開発用ギルド ID を設定してください。

## ボットの構成例

小さなボットなら、次のように置けます。

```txt
src/
  app/
    services.ts
    vivere.ts
  commands/
    ping.ts
  index.ts
```

コマンドは `createApp({ commands: [...] })` に渡して登録します。つながりが 1 か所に見えるので、流れを追いやすくなります。

## コントリビュート

[CONTRIBUTING.md](./CONTRIBUTING.md) を参照してください。

## ライセンス

MIT。詳しくは [LICENSE](./LICENSE) を参照してください。
