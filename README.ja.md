# Vivere

ボットが大きくなっても読みやすさを保てる、Discord ボット用の TypeScript フレームワーク。

[English](./README.md) · [한국어](./README.ko.md) · **日本語**

---

多くの Discord ボットは 1 つのファイルから始まりますが、やがてコマンド登録やオプションの
解析、権限チェック、ボタン処理が絡み合った塊になりがちです。Vivere は、そうならないための
手助けをするフレームワークです。型のついた小さな部品と予測しやすいファイル構成を用意する
ことで、コマンドが 2 つのボットでも 200 のボットでも、同じように整理された状態を保ちます。

[discord.js](https://discord.js.org) の上に構築されているため、エコシステムをそのまま
活かせますし、必要なときにはいつでも生のクライアントに降りていけます。

## Vivere を選ぶ理由

- **すべてに型があります。** コマンドのオプションを一度宣言すれば、`ctx.options` の型が
  自動的に推論されます。キャストも推測も不要です。
- **予測できる構造。** `src/commands/ping.ts` にあるコマンドは `/ping` になります。
  ファイルの場所が、そのまま役割を表します。
- **隠れた魔法はありません。** ボットは、最初から最後まで自分で読める入口ファイルから
  起動します。ファイルの自動検出はあくまで便利機能であり、すべてを明示的に登録することも
  できます。
- **小さな単位。** コマンド 1 つが独立したファイルなので、見つけるのも、読むのも、変える
  のも簡単です。

## ざっと見る

```ts
// src/commands/ping.ts
import { defineCommand } from '../app/vivere.js'

export const pingCommand = defineCommand({
  name: 'ping',
  description: 'Pong と返信します',
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

オプションはインラインで宣言し、その型はそのまま `execute` まで伝わります。

```ts
options: {
  target: opt.user('ロールを付与する相手'),
  silent: opt.boolean('静かに応答する').optional(),
},
// execute の中で ctx.options の型が完全に決まります。
//   ctx.options.target → User
//   ctx.options.silent → boolean | undefined
```

## はじめに

Vivere はまだ開発の初期段階で、npm には公開されていません。試すには、リポジトリを
クローンしてサンプルのボットを実行してください。

```bash
git clone https://github.com/jb0xyz/vivere.git
cd vivere
pnpm install
pnpm --filter vivere build

cd examples/basic-bot
cp .env.example .env   # ボットトークンと開発用ギルド ID を入力してください
pnpm start
```

ボットを開発用サーバーに招待し、`/ping` を実行してみてください。

## ボットの構成

```
basic-bot/
├─ src/
│  ├─ app/
│  │  ├─ vivere.ts     # createVivere<Services>() — 型のついた入口
│  │  └─ services.ts   # すべてのコマンドに渡される共有サービス
│  ├─ commands/
│  │  └─ ping.ts       # コマンド 1 つにつきファイル 1 つ
│  └─ index.ts         # createApp(...).start()
└─ package.json
```

`createVivere<Services>()` でサービスの型を一度だけ結びつけておけば、すべてのコマンドが
グローバルな設定なしに、完全に型のついた `ctx.services` を受け取ります。

## コントリビュート

Issue や Pull Request を歓迎します。プロジェクトのセットアップ方法や変更の提案方法は
[CONTRIBUTING.md](./CONTRIBUTING.md) をご覧ください。

## ライセンス

[MIT ライセンス](./LICENSE)の下で公開されています。
