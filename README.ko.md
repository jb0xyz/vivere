# Vivere

봇이 커져도 코드가 읽기 쉬운 상태로 남는 디스코드 봇 프레임워크.

[English](./README.md) · **한국어** · [日本語](./README.ja.md)

---

대부분의 디스코드 봇은 파일 하나로 시작하지만, 시간이 지나면 명령어 등록과 옵션 파싱,
권한 확인, 버튼 처리가 뒤엉킨 덩어리가 되기 쉽습니다. Vivere는 그런 일이 생기지 않도록
돕는 프레임워크입니다. 타입이 잡힌 작은 구성 요소와 예측 가능한 파일 구조를 제공해서,
명령어가 두 개인 봇이든 이백 개인 봇이든 똑같은 방식으로 정리되게 합니다.

[discord.js](https://discord.js.org) 위에서 동작하므로 기존 생태계를 그대로 쓸 수 있고,
필요할 때는 언제든 원본 클라이언트로 내려갈 수 있습니다.

## Vivere를 쓰는 이유

- **모든 것에 타입이 있습니다.** 명령어의 옵션을 한 번 선언하면 `ctx.options`의 타입이
  자동으로 추론됩니다. 캐스팅도, 추측도 필요 없습니다.
- **예측 가능한 구조.** `src/commands/ping.ts`에 있는 명령어는 `/ping`이 됩니다. 파일의
  위치가 곧 그 정체를 말해 줍니다.
- **숨은 마법이 없습니다.** 봇은 처음부터 끝까지 직접 읽을 수 있는 진입 파일에서
  시작합니다. 파일 자동 인식은 편의 기능일 뿐, 원한다면 모든 것을 명시적으로 등록할 수
  있습니다.
- **작은 단위.** 명령어 하나가 독립된 파일이라 찾기도, 읽기도, 바꾸기도 쉽습니다.

## 살펴보기

```ts
// src/commands/ping.ts
import { defineCommand } from '../app/vivere.js'

export const pingCommand = defineCommand({
  name: 'ping',
  description: 'Pong으로 응답합니다',
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

옵션은 인라인으로 선언하고, 그 타입은 그대로 `execute`까지 이어집니다.

```ts
options: {
  target: opt.user('역할을 부여할 대상'),
  silent: opt.boolean('조용히 응답').optional(),
},
// execute 안에서 ctx.options의 타입이 완전히 잡힙니다.
//   ctx.options.target → User
//   ctx.options.silent → boolean | undefined
```

## 시작하기

Vivere는 아직 초기 개발 단계이며 npm에 배포되지 않았습니다. 사용해 보려면 저장소를
클론하고 예제 봇을 실행하세요.

```bash
git clone https://github.com/jb0xyz/vivere.git
cd vivere
pnpm install
pnpm --filter vivere build

cd examples/basic-bot
cp .env.example .env   # 봇 토큰과 개발용 길드 ID를 입력하세요
pnpm start
```

봇을 개발용 서버에 초대한 뒤 `/ping`을 실행해 보세요.

## 봇의 구조

```
basic-bot/
├─ src/
│  ├─ app/
│  │  ├─ vivere.ts     # createVivere<Services>() — 타입이 잡힌 진입점
│  │  └─ services.ts   # 모든 명령어에 전달되는 공용 서비스
│  ├─ commands/
│  │  └─ ping.ts       # 명령어 하나당 파일 하나
│  └─ index.ts         # createApp(...).start()
└─ package.json
```

`createVivere<Services>()`로 서비스 타입을 한 번만 연결해 두면, 모든 명령어가 별도의
전역 설정 없이 타입이 완전히 잡힌 `ctx.services`를 받습니다.

## 기여하기

이슈와 풀 리퀘스트를 환영합니다. 프로젝트 설정 방법과 변경 제안 방법은
[CONTRIBUTING.md](./CONTRIBUTING.md)를 참고하세요.

## 라이선스

[MIT 라이선스](./LICENSE)로 배포됩니다.
