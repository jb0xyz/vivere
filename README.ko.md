[English](./README.md) · [**한국어**](./README.ko.md) · [日本語](./README.ja.md)

# Vivere

[![CI](https://github.com/jb0xyz/vivere/actions/workflows/ci.yml/badge.svg)](https://github.com/jb0xyz/vivere/actions/workflows/ci.yml)

Vivere는 명령, 이벤트, 컴포넌트를 타입이 잡힌 파일로 작성하고, 그 파일들을 [discord.js](https://discord.js.org) 위에서 등록·라우팅·실행해 주는 TypeScript 디스코드 봇 프레임워크입니다.

거대한 interaction switch문이나 손으로 관리하는 레지스트리 대신, 봇 기능을 파일 하나씩 나눠 둡니다. Vivere는 그 파일들을 발견하고, 결정적인 manifest를 만들고, 필요할 때 슬래시 명령을 등록하고, 들어온 Discord interaction을 타입이 맞는 핸들러로 보냅니다.

Vivere는 MIT 라이선스의 오픈소스 프로젝트이며 저장소는 [github.com/jb0xyz/vivere](https://github.com/jb0xyz/vivere)입니다. 현재 패키지 버전은 `0.1.0`입니다. 아직 초기 단계지만, 파일 기반 명령과 컴포넌트 작성 흐름은 동작합니다.

## 코드 모양

서비스 타입은 로컬 authoring 파일에서 한 번만 묶습니다.

```ts
// src/app/vivere.ts
import { createVivere } from 'vivere'
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

슬래시 명령은 default export 하나로 작성합니다.

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

옵션은 핸들러 옆에 선언합니다. `ctx.options` 타입은 옵션 선언에서 추론되고, 문자열 옵션에는 autocomplete를 붙일 수 있습니다.

```ts
// src/commands/search.ts -> /search
import { defineCommand, opt } from '../app/vivere.js'

export default defineCommand({
  name: 'search',
  description: '항목을 검색합니다',
  options: {
    query: opt.string('검색어').autocomplete(async (ctx, value) => [
      { name: 'Apple', value: 'apple' },
    ]),
  },
  async execute(ctx) {
    await ctx.reply(`선택: ${ctx.options.query}`)
  },
})
```

폴더는 슬래시 명령 경로가 됩니다.

```txt
src/commands/admin/index.ts  -> /admin 메타데이터
src/commands/admin/ban.ts    -> /admin ban
```

이벤트도 같은 형태로 둡니다.

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

컴포넌트는 서명된 `customId` params를 담고, 클릭이나 제출 시 타입이 잡힌 핸들러로 들어옵니다.

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
    await ctx.reply({ content: `받았습니다: ${ctx.fields.subject}` })
  },
})
```

명령, 버튼, select 메뉴 안에서는 modal을 바로 띄울 수 있습니다.

```ts
await ctx.showModal(feedbackModal, {
  params: { userId: '123456789012345678' },
  title: 'Feedback',
})
```

봇은 직접 소유한 진입점에서 시작합니다.

```ts
// src/index.ts
import { GatewayIntentBits, createApp } from 'vivere'
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

## 기능

- `opt.*`로 선언하는 타입드 슬래시 명령 옵션.
- 옵션 autocomplete resolver.
- `commands/admin/ban.ts` -> `/admin ban`처럼 폴더 기반 서브커맨드와 그룹.
- `defineEvent`로 작성하는 Discord 이벤트.
- `defineButton`, `defineSelect`, `defineModal`로 작성하는 버튼, 문자열 select 메뉴, modal.
- `customId`에 서명되어 들어가는 컴포넌트 params와 실행 전 디코딩.
- 얇은 핸들러 context: 필요한 위치에서 `ctx.options`, `ctx.params`, `ctx.fields`, `ctx.values`, `ctx.services`, `reply`, `defer`, `update`, `showModal`.
- `createApp({ discover })` 기반 파일 discovery.
- 결정적으로 생성되는 `.vivere/manifest.json`.

## CLI

워크스페이스 패키지에서 CLI를 실행합니다.

```sh
vivere build
vivere build --check
vivere sync
vivere sync --global
```

`vivere build`는 `.vivere/manifest.json`을 생성합니다. `vivere build --check`는 생성 결과와 커밋된 manifest를 비교하고, 차이가 있으면 0이 아닌 코드로 종료합니다. `vivere sync`는 설정된 개발 길드에 명령을 등록하고, `vivere sync --global`은 전역 명령으로 등록합니다.

## 예제 실행

저장소에서 기본 봇 예제를 실행할 수 있습니다.

```sh
git clone https://github.com/jb0xyz/vivere.git
cd vivere
pnpm install
pnpm --filter vivere build
cd examples/basic-bot
cp .env.example .env
pnpm start
```

시작하기 전에 `.env`에 디스코드 봇 토큰과 개발 길드 ID를 넣어 주세요.

## 봇 폴더 구조

파일 기반 봇은 다음처럼 둘 수 있습니다.

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

파일 경로는 기능의 위치를 보여 주고, 파일 안의 정의는 Vivere가 등록과 라우팅에 사용할 타입 계약이 됩니다.

## 기여

[CONTRIBUTING.md](./CONTRIBUTING.md)를 참고해 주세요.

## 라이선스

MIT. 자세한 내용은 [LICENSE](./LICENSE)를 확인해 주세요.
