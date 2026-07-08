#!/usr/bin/env node
import { spawn } from 'node:child_process'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { cancel, confirm, intro, isCancel, multiselect, outro, select, spinner, text } from '@clack/prompts'
import { CATALOGS, scaffoldProject } from './scaffold.js'
import type { ExampleKind, Locale, ScaffoldAnswers, Transport } from './scaffold.js'
import { assertWritableTarget, writeFileMap } from './write-project.js'

type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun'

export function getInitialProjectName(args: string[]): string | undefined {
  return args.find((arg) => !arg.startsWith('-'))
}

export function validateProjectName(value: string): string | undefined {
  return value.trim() ? undefined : CATALOGS.en.projectNameRequired
}

export function getPackageManager(userAgent = process.env.npm_config_user_agent): PackageManager {
  if (userAgent?.startsWith('pnpm/')) return 'pnpm'
  if (userAgent?.startsWith('yarn/')) return 'yarn'
  if (userAgent?.startsWith('bun/')) return 'bun'
  return 'npm'
}

function formatMessage(locale: Locale, key: keyof typeof CATALOGS.en, values: Record<string, string> = {}): string {
  return Object.entries(values).reduce(
    (message, [name, value]) => message.replaceAll(`{${name}}`, value),
    CATALOGS[locale][key],
  )
}

function unwrapPrompt<T>(value: T | symbol, locale: Locale): T {
  if (!isCancel(value)) return value
  cancel(CATALOGS[locale].cancelMessage)
  process.exit(0)
}

async function promptLocale(): Promise<Locale> {
  const locale = await select({
    message: CATALOGS.en.languageMessage,
    options: [
      { value: 'en', label: 'English' },
      { value: 'ko', label: '한국어' },
      { value: 'ja', label: '日本語' },
    ],
  })
  return unwrapPrompt(locale, 'en') as Locale
}

async function promptProjectName(locale: Locale, initialProjectName: string | undefined): Promise<string> {
  if (initialProjectName) return initialProjectName

  const projectName = await text({
    message: CATALOGS[locale].projectNameMessage,
    placeholder: CATALOGS[locale].projectNamePlaceholder,
    validate(value) {
      return (value ?? '').trim() ? undefined : CATALOGS[locale].projectNameRequired
    },
  })

  return unwrapPrompt(projectName, locale).trim()
}

async function promptTransport(locale: Locale): Promise<Transport> {
  const transport = await select({
    message: CATALOGS[locale].transportMessage,
    options: [
      { value: 'gateway', label: CATALOGS[locale].transportGateway, hint: CATALOGS[locale].transportGatewayHint },
      { value: 'http', label: CATALOGS[locale].transportHttp, hint: CATALOGS[locale].transportHttpHint },
    ],
  })
  return unwrapPrompt(transport, locale) as Transport
}

async function promptExamples(locale: Locale): Promise<ExampleKind[]> {
  const examples = await multiselect({
    message: CATALOGS[locale].examplesMessage,
    initialValues: ['command', 'event'],
    options: [
      { value: 'command', label: CATALOGS[locale].exampleCommand },
      { value: 'event', label: CATALOGS[locale].exampleEvent },
      { value: 'component', label: CATALOGS[locale].exampleComponent },
      { value: 'plugin', label: CATALOGS[locale].examplePlugin },
    ],
    required: false,
  })
  return unwrapPrompt(examples, locale) as ExampleKind[]
}

async function promptAnswers(args: string[]): Promise<ScaffoldAnswers> {
  const locale = await promptLocale()
  const projectName = await promptProjectName(locale, getInitialProjectName(args))
  const transport = await promptTransport(locale)
  const examples = await promptExamples(locale)
  const git = unwrapPrompt(await confirm({ message: CATALOGS[locale].gitMessage, initialValue: true }), locale)
  const install = unwrapPrompt(await confirm({ message: CATALOGS[locale].installMessage, initialValue: true }), locale)

  return { locale, projectName, transport, examples, git, install }
}

function runCommand(command: string, args: string[], cwd: string): Promise<void> {
  return new Promise((resolveCommand, rejectCommand) => {
    const child = spawn(command, args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' })
    child.on('error', rejectCommand)
    child.on('exit', (code) => {
      if (code === 0) resolveCommand()
      else rejectCommand(new Error(`${command} ${args.join(' ')} exited with code ${code ?? 'unknown'}`))
    })
  })
}

async function createProject(answers: ScaffoldAnswers, packageManager: PackageManager): Promise<void> {
  const targetDir = resolve(process.cwd(), answers.projectName)
  const result = scaffoldProject(answers)
  const loading = spinner()

  loading.start(formatMessage(answers.locale, 'creatingMessage', { projectName: answers.projectName }))
  await assertWritableTarget(targetDir)
  await writeFileMap(targetDir, result.files)
  loading.stop(formatMessage(answers.locale, 'createdMessage', { projectName: answers.projectName }))

  if (answers.git) await runCommand('git', ['init'], targetDir)
  if (answers.install) await runCommand(packageManager, ['install'], targetDir)

  outro(result.nextSteps.join('\n'))
}

export async function main(args = process.argv.slice(2)): Promise<void> {
  intro('create-vivere')
  const packageManager = getPackageManager()
  const answers = await promptAnswers(args)
  await createProject(answers, packageManager)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
}
