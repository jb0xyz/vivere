[English](./README.md) · [한국어](./README.ko.md) · [**日本語**](./README.ja.md)

# Vivere

[![CI](https://github.com/jb0xyz/vivere/actions/workflows/ci.yml/badge.svg)](https://github.com/jb0xyz/vivere/actions/workflows/ci.yml)

Vivere は、コマンド、イベント、コンポーネントを型付きのファイルとして書き、それらを [discord.js](https://discord.js.org) の上で登録、ルーティング、実行する TypeScript 製 Discord ボットフレームワークです。

大きな interaction の switch 文や、手作業のレジストリを持たずに済むように、ボットの機能を 1 ファイルずつ分けて置きます。Vivere はそのファイルを見つけ、決定的な manifest を作り、必要なときにスラッシュコマンドを登録し、Discord から届いた interaction を型の付いたハンドラーへ渡します。

Vivere は MIT ライセンスのオープンソースプロジェクトです。リポジトリは [github.com/jb0xyz/vivere](https://github.com/jb0xyz/vivere) にあります。npm パッケージ名は `@jb0xyz/vivere` です。現在のパッケージバージョンは `0.1.0` です。まだ初期段階ですが、ファイルベースのコマンドとコンポーネントの流れは動作します。

## コード例

サービスの型は、ローカルの authoring ファイルで一度だけ結び付けます。

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

スラッシュコマンドは default export として書きます。

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

オプションはハンドラーのそばで宣言します。`ctx.options` の型は宣言から推論され、文字列オプションには autocomplete を付けられます。

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

フォルダはスラッシュコマンドのルートになります。

```txt
src/commands/admin/index.ts  -> /admin のメタデータ
src/commands/admin/ban.ts    -> /admin ban
```

イベントも同じ形で置けます。

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

コンポーネントは署名付きの `customId` params を持ち、クリックや送信のあとに型付きのハンドラーへ届きます。

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

コマンド、ボタン、select メニューの中から modal を開けます。

```ts
await ctx.showModal(feedbackModal, {
  params: { userId: '123456789012345678' },
  title: 'Feedback',
})
```

ボットは自分のエントリーファイルから起動します。

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

## 機能

- `opt.*` で宣言する、型付きのスラッシュコマンドオプション。
- オプションごとの autocomplete resolver。
- `commands/admin/ban.ts` -> `/admin ban` のような、フォルダベースのサブコマンドとグループ。
- `defineEvent` で書く Discord イベント。
- `defineButton`、`defineSelect`、`defineModal` で書くボタン、文字列 select メニュー、modal。
- `customId` に入る署名付きコンポーネント params と、ハンドラー実行前のデコード。
- 必要なものだけを持つハンドラー context: `ctx.options`、`ctx.params`、`ctx.fields`、`ctx.values`、`ctx.services`、`reply`、`defer`、`update`、`showModal`。
- `createApp({ discover })` によるファイル discovery。
- 決定的に生成される `.vivere/manifest.json`。

## CLI

ワークスペースのパッケージから CLI を実行します。

```sh
vivere build
vivere build --check
vivere sync
vivere sync --global
```

`vivere build` は `.vivere/manifest.json` を書き出します。`vivere build --check` は生成結果とコミット済みの manifest を比較し、差分があれば 0 以外で終了します。`vivere sync` は設定された開発用ギルドにコマンドを登録し、`vivere sync --global` はグローバルコマンドとして登録します。

## インストール

ボットプロジェクトにパッケージを追加します。

```sh
npm install @jb0xyz/vivere
# または
pnpm add @jb0xyz/vivere
```

## サンプルを動かす

リポジトリから basic bot を実行できます。

```sh
git clone https://github.com/jb0xyz/vivere.git
cd vivere
pnpm install
pnpm --filter @jb0xyz/vivere build
cd examples/basic-bot
cp .env.example .env
pnpm start
```

起動する前に、`.env` に Discord ボットトークンと開発用ギルド ID を設定してください。

## ボットの構成

ファイルベースのボットは、次のように置けます。

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

ファイルパスは機能の場所を示します。ファイル内の定義は、Vivere が登録とルーティングに使う型付きの契約になります。

## コントリビュート

[CONTRIBUTING.md](./CONTRIBUTING.md) を参照してください。

## ライセンス

MIT。詳しくは [LICENSE](./LICENSE) を参照してください。
