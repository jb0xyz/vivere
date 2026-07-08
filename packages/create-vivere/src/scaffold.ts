import { CATALOGS } from './locales/index.js'
import type { CatalogKey, Locale } from './locales/index.js'

export { CATALOGS }
export type { Locale }

export type Transport = 'gateway' | 'http'
export type ExampleKind = 'command' | 'event' | 'component' | 'plugin'

export interface ScaffoldAnswers {
  locale: Locale
  projectName: string
  transport: Transport
  examples: ExampleKind[]
  git: boolean
  install: boolean
}

export type FileMap = Record<string, string>

export interface ScaffoldResult {
  files: FileMap
  nextSteps: string[]
}

interface FormatValues {
  projectName?: string
  packageManager?: string
}

const PACKAGE_VERSION = '^0.3.0'
const DEFAULT_PACKAGE_MANAGER = 'pnpm'

function formatMessage(locale: Locale, key: CatalogKey, values: FormatValues = {}): string {
  return Object.entries(values).reduce(
    (message, [name, value]) => message.replaceAll(`{${name}}`, value ?? ''),
    CATALOGS[locale][key],
  )
}

function hasExample(answers: ScaffoldAnswers, example: ExampleKind): boolean {
  return answers.examples.includes(example)
}

function normalizePackageName(projectName: string): string {
  return projectName.trim().toLowerCase().replace(/\s+/g, '-')
}

function createPackageJson(answers: ScaffoldAnswers): string {
  const packageJson = {
    name: normalizePackageName(answers.projectName),
    private: true,
    type: 'module',
    scripts: {
      dev: answers.transport === 'gateway' ? 'tsx src/index.ts' : 'tsx src/server.ts',
      build: 'tsc --noEmit',
      'vivere:build': 'vivere build',
      'vivere:sync': 'vivere sync',
    },
    dependencies: {
      '@jb0xyz/vivere': PACKAGE_VERSION,
    },
    devDependencies: {
      '@types/node': '^22.7.0',
      tsx: '^4.19.0',
      typescript: '^5.6.0',
    },
  }

  return `${JSON.stringify(packageJson, null, 2)}\n`
}

function createTsconfig(): string {
  return `${JSON.stringify(
    {
      compilerOptions: {
        target: 'ES2022',
        module: 'NodeNext',
        moduleResolution: 'NodeNext',
        lib: ['ES2022'],
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
      },
      include: ['src', 'vivere.config.ts'],
    },
    null,
    2,
  )}\n`
}

function createEnvExample(answers: ScaffoldAnswers): string {
  const locale = answers.locale
  const lineList = [
    `# ${formatMessage(locale, 'envToken')}`,
    'DISCORD_TOKEN=your-bot-token',
    '',
    `# ${formatMessage(locale, 'envGuild')}`,
    'DEV_GUILD_ID=your-dev-guild-id',
  ]

  if (answers.transport === 'http') {
    lineList.push(
      '',
      `# ${formatMessage(locale, 'envPublicKey')}`,
      'DISCORD_PUBLIC_KEY=your-discord-public-key',
      '',
      `# ${formatMessage(locale, 'envCustomIdSecret')}`,
      'CUSTOM_ID_SECRET=replace-with-a-long-random-secret',
    )
  }

  return `${lineList.join('\n')}\n`
}

function createReadme(answers: ScaffoldAnswers): string {
  const locale = answers.locale
  const introKey = answers.transport === 'gateway' ? 'readmeIntroGateway' : 'readmeIntroHttp'
  const runKey = answers.transport === 'gateway' ? 'readmeRunGateway' : 'readmeRunHttp'

  return `# ${answers.projectName}

${formatMessage(locale, introKey)}

## ${formatMessage(locale, 'readmeSetupTitle')}

${formatMessage(locale, 'readmeEnv')}

\`\`\`sh
cp .env.example .env
${DEFAULT_PACKAGE_MANAGER} install
\`\`\`

${formatMessage(locale, runKey)}

\`\`\`sh
${DEFAULT_PACKAGE_MANAGER} dev
\`\`\`

${formatMessage(locale, 'readmeBuild')}

\`\`\`sh
${DEFAULT_PACKAGE_MANAGER} vivere:build
\`\`\`

${formatMessage(locale, 'readmeSync')}

\`\`\`sh
${DEFAULT_PACKAGE_MANAGER} vivere:sync
\`\`\`

## ${formatMessage(locale, 'readmeStructureTitle')}

\`\`\`txt
src/
  app/
  commands/
  events/
  components/
  plugins/
\`\`\`
`
}

function createAgentsFile(answers: ScaffoldAnswers): string {
  const locale = answers.locale
  const transportKey = answers.transport === 'gateway' ? 'agentsGatewayEntry' : 'agentsHttpEntry'

  return `# AGENTS.md

## ${formatMessage(locale, 'agentsTitle')}

${formatMessage(locale, 'agentsIntro')}

## ${formatMessage(locale, 'agentsStructureTitle')}

${formatMessage(locale, 'agentsStructureBody')}

\`\`\`txt
src/
  app/vivere.ts
  commands/
  events/
  components/
vivere.config.ts
.vivere/manifest.json
\`\`\`

## ${formatMessage(locale, 'agentsAddTitle')}

- ${formatMessage(locale, 'agentsCommand')}
- ${formatMessage(locale, 'agentsEvent')}
- ${formatMessage(locale, 'agentsComponent')}
- ${formatMessage(locale, 'agentsPolicies')}

## ${formatMessage(locale, 'agentsManifestTitle')}

${formatMessage(locale, 'agentsManifestBody')}

## ${formatMessage(locale, 'agentsTransportTitle')}

${formatMessage(locale, transportKey)}

## ${formatMessage(locale, 'agentsCliTitle')}

- ${formatMessage(locale, 'agentsCliBuild')}
- ${formatMessage(locale, 'agentsCliSync')}
- ${formatMessage(locale, 'agentsCliDev')}
`
}

function createServicesFile(): string {
  return `export type Services = {
  logger: {
    info(message: string): void
  }
}

export async function createServices(): Promise<Services> {
  return {
    logger: {
      info(message) {
        console.info(message)
      },
    },
  }
}
`
}

function createVivereFile(answers: ScaffoldAnswers): string {
  return `// ${formatMessage(answers.locale, 'fileHeader')}
import { createVivere } from '@jb0xyz/vivere'
import type { Services } from './services.js'

export const {
  defineButton,
  defineCommand,
  defineEvent,
  defineModal,
  definePlugin,
  defineSelect,
  field,
  opt,
  param,
} = createVivere<Services>()
`
}

function createCommandFile(answers: ScaffoldAnswers): string {
  return `import { defineCommand } from '../app/vivere.js'

export default defineCommand({
  name: 'ping',
  description: '${formatMessage(answers.locale, 'pingDescription')}',
  async execute(ctx) {
    await ctx.reply('${formatMessage(answers.locale, 'pingReply')}')
  },
})
`
}

function createEventFile(answers: ScaffoldAnswers): string {
  return `import { defineEvent } from '../app/vivere.js'

export default defineEvent({
  name: 'ready',
  once: true,
  async execute(ctx) {
    ctx.services.logger.info('${formatMessage(answers.locale, 'readyLog')}')
  },
})
`
}

function createComponentFile(answers: ScaffoldAnswers): string {
  return `import { defineButton, param } from '../app/vivere.js'

export default defineButton({
  id: 'confirm',
  params: {
    userId: param.snowflake(),
  },
  async execute(ctx) {
    await ctx.update({ content: \`${formatMessage(answers.locale, 'confirmReply')}: \${ctx.params.userId}\` })
  },
})
`
}

function createAskCommandFile(answers: ScaffoldAnswers): string {
  return `import { defineCommand } from '../app/vivere.js'
import confirmButton from '../components/confirm.js'

export default defineCommand({
  name: 'confirm',
  description: '${formatMessage(answers.locale, 'confirmDescription')}',
  async execute(ctx) {
    await ctx.reply({
      content: '${formatMessage(answers.locale, 'confirmDescription')}',
      components: [
        ctx.components.button(confirmButton, {
          params: { userId: ctx.userId },
          label: '${formatMessage(answers.locale, 'confirmButtonLabel')}',
        }),
      ],
    })
  },
})
`
}

function createPluginFile(answers: ScaffoldAnswers): string {
  return `import { defineCommand, definePlugin } from '../app/vivere.js'

const statusCommand = defineCommand({
  name: 'status',
  description: '${formatMessage(answers.locale, 'pluginStatusDescription')}',
  async execute(ctx) {
    await ctx.reply('${formatMessage(answers.locale, 'pluginStatusReply')}')
  },
})

export default definePlugin({
  name: 'sample-plugin',
  commands: [statusCommand],
})
`
}

function createConfigFile(answers: ScaffoldAnswers): string {
  const hasPlugin = hasExample(answers, 'plugin')
  const importList = hasPlugin ? "import samplePlugin from './src/plugins/sample-plugin.js'\n" : ''
  const pluginLine = hasPlugin ? ',\n  plugins: [samplePlugin]' : ''

  return `import { defineConfig } from '@jb0xyz/vivere'
${importList}
export default defineConfig({
  discovery: {
    commands: 'src/commands',
    events: 'src/events',
    components: 'src/components',
  },
  devGuildId: process.env.DEV_GUILD_ID${pluginLine},
})
`
}

function createGatewayIndex(answers: ScaffoldAnswers): string {
  return `// ${formatMessage(answers.locale, 'fileHeader')}
import { GatewayIntentBits, createApp } from '@jb0xyz/vivere'
import { createServices } from './app/services.js'
import config from '../vivere.config.js'

const app = createApp({
  config: {
    token: process.env.DISCORD_TOKEN!,
    intents: [GatewayIntentBits.Guilds],
    devGuildId: process.env.DEV_GUILD_ID,
  },
  createServices,
  discover: config.discovery,
  plugins: config.plugins,
})

await app.start()
`
}

function createHttpIndex(answers: ScaffoldAnswers): string {
  const commandImportList = [
    hasExample(answers, 'command') ? "import pingCommand from './commands/ping.js'" : '',
    hasExample(answers, 'component') ? "import confirmCommand from './commands/confirm.js'" : '',
  ].filter(Boolean)
  const componentImportList = hasExample(answers, 'component') ? ["import confirmButton from './components/confirm.js'"] : []
  const pluginImportList = hasExample(answers, 'plugin') ? ["import samplePlugin from './plugins/sample-plugin.js'"] : []
  const commandList = [
    hasExample(answers, 'command') ? 'pingCommand' : '',
    hasExample(answers, 'component') ? 'confirmCommand' : '',
  ].filter(Boolean)
  const componentList = hasExample(answers, 'component') ? ['confirmButton'] : []
  const pluginList = hasExample(answers, 'plugin') ? ['samplePlugin'] : []

  return `// ${formatMessage(answers.locale, 'fileHeader')}
import { createHttpHandler } from '@jb0xyz/vivere/http'
import { createServices } from './app/services.js'
${[...commandImportList, ...componentImportList, ...pluginImportList].join('\n')}

export const handler = createHttpHandler({
  publicKey: process.env.DISCORD_PUBLIC_KEY!,
  customIdSecret: process.env.CUSTOM_ID_SECRET,
  createServices,
  commands: [${commandList.join(', ')}],
  components: [${componentList.join(', ')}],
  plugins: [${pluginList.join(', ')}],
})
`
}

function createHttpServer(answers: ScaffoldAnswers): string {
  return `import { createServer } from 'node:http'
import { handler } from './index.js'

const server = createServer(async (request, response) => {
  const chunkList: Buffer[] = []

  for await (const chunk of request) {
    chunkList.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }

  const result = await handler(Buffer.concat(chunkList).toString('utf8'), request.headers)
  response.statusCode = result.status
  response.setHeader('content-type', 'application/json')
  response.end(result.body)
})

const port = Number(process.env.PORT ?? 3000)
server.listen(port, () => {
  console.info('${formatMessage(answers.locale, 'serverListening')}', port)
})
`
}

function addDirectoryPlaceholders(files: FileMap): void {
  for (const dir of ['src/commands', 'src/events', 'src/components', 'src/plugins']) {
    const hasFile = Object.keys(files).some((path) => path.startsWith(`${dir}/`))
    if (!hasFile) files[`${dir}/.gitkeep`] = ''
  }
}

export function createNextSteps(answers: ScaffoldAnswers, packageManager = DEFAULT_PACKAGE_MANAGER): string[] {
  const values = { projectName: answers.projectName, packageManager }
  const steps = [
    formatMessage(answers.locale, 'nextStepsTitle'),
    formatMessage(answers.locale, 'nextStepCd', values),
  ]
  if (!answers.install) steps.push(formatMessage(answers.locale, 'nextStepInstall', values))
  steps.push(
    formatMessage(answers.locale, 'nextStepEnv', values),
    formatMessage(answers.locale, answers.transport === 'gateway' ? 'nextStepDevGateway' : 'nextStepDevHttp', values),
    formatMessage(answers.locale, 'nextStepBuild', values),
  )
  return steps
}

export function scaffoldProject(answers: ScaffoldAnswers): ScaffoldResult {
  const files: FileMap = {
    'package.json': createPackageJson(answers),
    'tsconfig.json': createTsconfig(),
    '.env.example': createEnvExample(answers),
    'README.md': createReadme(answers),
    'AGENTS.md': createAgentsFile(answers),
    'src/app/services.ts': createServicesFile(),
    'src/app/vivere.ts': createVivereFile(answers),
    'vivere.config.ts': createConfigFile(answers),
    'src/index.ts': answers.transport === 'gateway' ? createGatewayIndex(answers) : createHttpIndex(answers),
  }

  if (answers.transport === 'http') files['src/server.ts'] = createHttpServer(answers)
  if (hasExample(answers, 'command')) files['src/commands/ping.ts'] = createCommandFile(answers)
  if (hasExample(answers, 'event')) files['src/events/ready.ts'] = createEventFile(answers)
  if (hasExample(answers, 'component')) {
    files['src/components/confirm.ts'] = createComponentFile(answers)
    files['src/commands/confirm.ts'] = createAskCommandFile(answers)
  }
  if (hasExample(answers, 'plugin')) files['src/plugins/sample-plugin.ts'] = createPluginFile(answers)

  addDirectoryPlaceholders(files)

  return {
    files,
    nextSteps: createNextSteps(answers),
  }
}
