import { describe, expect, test } from 'vitest'
import { CATALOGS, createNextSteps, scaffoldProject } from './scaffold.js'
import type { Locale, ScaffoldAnswers } from './scaffold.js'

const FORBIDDEN_PATTERN = new RegExp(['A' + 'I', 'Clau' + 'de', 'Co' + 'dex', 'Anth' + 'ropic'].join('|'))

const LOCALE_README_TEXT = {
  en: 'A Discord bot built with Vivere.',
  ko: 'Vivere로 만든 디스코드 봇입니다.',
  ja: 'Vivere で作る Discord ボットです。',
} satisfies Record<Locale, string>

const LOCALE_ENV_TEXT = {
  en: 'Discord bot token',
  ko: 'Discord 봇 토큰',
  ja: 'Discord ボットトークン',
} satisfies Record<Locale, string>

const LOCALE_AGENTS_TEXT = {
  en: 'Read .vivere/manifest.json first',
  ko: '.vivere/manifest.json을 먼저 읽으세요',
  ja: 'まず .vivere/manifest.json を読んでください',
} satisfies Record<Locale, string>

const LOCALE_AGENTS_GATEWAY_TEXT = {
  en: 'src/index.ts starts the Gateway app',
  ko: 'src/index.ts는 Gateway 앱을 시작합니다',
  ja: 'src/index.ts は Gateway アプリを起動します',
} satisfies Record<Locale, string>

const LOCALE_AGENTS_HTTP_TEXT = {
  en: 'src/index.ts exports the HTTP interaction handler',
  ko: 'src/index.ts는 HTTP interaction handler를 export합니다',
  ja: 'src/index.ts は HTTP interaction handler を export します',
} satisfies Record<Locale, string>

function createAnswers(input: Partial<ScaffoldAnswers> = {}): ScaffoldAnswers {
  return {
    locale: 'en',
    projectName: 'my-bot',
    transport: 'gateway',
    examples: ['command', 'event', 'component', 'plugin'],
    git: true,
    install: false,
    ...input,
  }
}

describe('scaffoldProject', () => {
  test.each(['en', 'ko', 'ja'] as const)('creates localized files for %s', (locale) => {
    const result = scaffoldProject(createAnswers({ locale }))
    const content = Object.values(result.files).join('\n')

    expect(result.files['README.md']).toContain(LOCALE_README_TEXT[locale])
    expect(result.files['.env.example']).toContain(LOCALE_ENV_TEXT[locale])
    expect(result.files['src/app/vivere.ts']).toContain('createVivere<Services>()')
    expect(result.files['src/commands/ping.ts']).toContain('defineCommand')
    expect(result.files['src/components/confirm.ts']).toContain('defineButton')
    expect(result.files['src/plugins/sample-plugin.ts']).toContain('definePlugin')
    expect(content).not.toMatch(FORBIDDEN_PATTERN)
  })

  test('uses gateway entrypoint for gateway projects', () => {
    const result = scaffoldProject(createAnswers({ transport: 'gateway' }))

    expect(result.files['src/index.ts']).toContain('createApp')
    expect(result.files['src/index.ts']).toContain('GatewayIntentBits.Guilds')
    expect(result.files['src/index.ts']).toContain('await app.start()')
    expect(result.files['.env.example']).toContain('DISCORD_TOKEN=')
  })

  test('uses HTTP handler entrypoint for HTTP projects', () => {
    const result = scaffoldProject(createAnswers({ transport: 'http' }))

    expect(result.files['src/index.ts']).toContain("from '@jb0xyz/vivere/http'")
    expect(result.files['src/index.ts']).toContain('createHttpHandler')
    expect(result.files['src/server.ts']).toContain('createServer')
    expect(result.files['.env.example']).toContain('DISCORD_PUBLIC_KEY=')
    expect(result.files['.env.example']).toContain('CUSTOM_ID_SECRET=')
  })

  test('keeps discovery directories stable when examples are omitted', () => {
    const result = scaffoldProject(createAnswers({ examples: ['command'] }))

    expect(result.files['src/commands/ping.ts']).toBeDefined()
    expect(result.files['src/events/.gitkeep']).toBe('')
    expect(result.files['src/components/.gitkeep']).toBe('')
    expect(result.files['src/plugins/sample-plugin.ts']).toBeUndefined()
    expect(result.files['vivere.config.ts']).not.toContain('plugins:')
  })

  test('keeps code identifiers in English while localizing user-facing strings', () => {
    const result = scaffoldProject(createAnswers({ locale: 'ko' }))

    expect(result.files['src/app/services.ts']).toContain('createServices')
    expect(result.files['src/commands/confirm.ts']).toContain('confirmButton')
    expect(result.files['src/plugins/sample-plugin.ts']).toContain('statusCommand')
    expect(result.files['src/commands/ping.ts']).toContain("description: 'Pong을 반환합니다'")
  })

  test.each(['en', 'ko', 'ja'] as const)('creates localized AGENTS.md for %s', (locale) => {
    const gateway = scaffoldProject(createAnswers({ locale, transport: 'gateway' }))
    const http = scaffoldProject(createAnswers({ locale, transport: 'http' }))

    expect(gateway.files['AGENTS.md']).toContain(LOCALE_AGENTS_TEXT[locale])
    expect(gateway.files['AGENTS.md']).toContain('src/app/vivere.ts')
    expect(gateway.files['AGENTS.md']).toContain('defineCommand')
    expect(gateway.files['AGENTS.md']).toContain('policies: []')
    expect(gateway.files['AGENTS.md']).toContain(LOCALE_AGENTS_GATEWAY_TEXT[locale])
    expect(http.files['AGENTS.md']).toContain(LOCALE_AGENTS_HTTP_TEXT[locale])
  })

  test('uses the same catalog keys for every locale', () => {
    const keyList = Object.keys(CATALOGS.en).sort()

    expect(Object.keys(CATALOGS.ko).sort()).toEqual(keyList)
    expect(Object.keys(CATALOGS.ja).sort()).toEqual(keyList)
  })
})

describe('createNextSteps', () => {
  test('localizes next steps and omits install when dependencies were installed', () => {
    const steps = createNextSteps(createAnswers({ locale: 'ko', install: true }))

    expect(steps.join('\n')).toContain('다음 단계')
    expect(steps.join('\n')).not.toContain('pnpm install')
    expect(steps.join('\n')).toContain('pnpm dev')
  })
})
