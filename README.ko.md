[English](./README.md) · [**한국어**](./README.ko.md) · [日本語](./README.ja.md)

# Vivere

[![CI](https://github.com/jb0xyz/vivere/actions/workflows/ci.yml/badge.svg)](https://github.com/jb0xyz/vivere/actions/workflows/ci.yml)

Vivere는 슬래시 명령 하나를 타입이 잡힌 파일 하나로 작성하면, [discord.js](https://discord.js.org) 위에서 등록·라우팅·실행을 처리해 주는 TypeScript 디스코드 봇 프레임워크입니다.

코드로 봇을 만드는 프로젝트를 대상으로 합니다. 명령 파일 안에 이름, 설명, 옵션, 실행 함수를 함께 적고, Vivere는 그 정의를 읽어 타입이 잡힌 `ctx`를 넘겨줍니다. 거대한 switch문이나 반복되는 interaction 처리 코드 없이 봇 구조가 파일 구조로 드러납니다.

Vivere는 MIT 라이선스의 오픈소스 프로젝트이며 저장소는 [github.com/jb0xyz/vivere](https://github.com/jb0xyz/vivere)입니다. 패키지명은 `vivere`이지만 아직 npm에는 배포되지 않았습니다.

## 코드 모양

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

봇은 직접 소유한 진입점에서 시작합니다.

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

옵션 타입은 선언에서 추론됩니다.

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

이 핸들러에서 `ctx.options.target`은 `User`, `ctx.options.silent`는 `boolean | undefined`입니다.

서비스 타입은 한 번만 묶습니다.

```ts
// src/app/vivere.ts
import { createVivere } from 'vivere'
import type { ServicesType } from './services.js'

export const vivere = createVivere<ServicesType>()

export const defineCommand = vivere.defineCommand
export const opt = vivere.opt
```

이 파일을 통해 만든 모든 명령은 같은 타입의 `ctx.services`를 받습니다.

## 예제 실행

Vivere는 아직 npm에 배포되지 않았습니다. 저장소를 받아서 실행합니다.

```sh
git clone https://github.com/jb0xyz/vivere.git
cd vivere
pnpm install
pnpm --filter vivere build
cd examples/basic-bot
cp .env.example .env
pnpm start
```

예제를 시작하기 전에 `.env`에 디스코드 봇 토큰과 개발 길드 ID를 넣어 주세요.

## 봇 폴더 구조

작은 봇은 다음처럼 둘 수 있습니다.

```txt
src/
  app/
    services.ts
    vivere.ts
  commands/
    ping.ts
  index.ts
```

명령은 `createApp({ commands: [...] })`에 넘겨 등록하며, 연결이 한곳에 드러나 흐름을 따라가기 쉽습니다.

## 기여

[CONTRIBUTING.md](./CONTRIBUTING.md)를 참고해 주세요.

## 라이선스

MIT. 자세한 내용은 [LICENSE](./LICENSE)를 확인해 주세요.
