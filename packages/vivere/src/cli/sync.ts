import { dirname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { REST, Routes } from 'discord.js'
import { createJiti } from 'jiti'
import type { RESTPostAPIApplicationCommandsJSONBody } from 'discord.js'
import type { VivereConfig } from '../config/define-config.js'
import { resolveProjectDefinitions } from '../discovery/project-definitions.js'
import { buildCommandTree } from '../discord/to-command-json.js'

export interface SyncRestClient {
  get(route: string): Promise<unknown>
  put(route: string, options: { body: RESTPostAPIApplicationCommandsJSONBody[] }): Promise<unknown>
}

export interface RunSyncInput {
  cwd: string
  global: boolean
  env?: Record<string, string | undefined>
  createRest?: (token: string) => SyncRestClient
}

export interface RunSyncResult {
  commandCount: number
  scope: 'guild' | 'global'
}

async function loadConfig(configPath: string): Promise<VivereConfig> {
  const jiti = createJiti(pathToFileURL(configPath).href)
  return jiti.import<VivereConfig>(configPath, { default: true })
}

function createDefaultRest(token: string): SyncRestClient {
  return new REST({ version: '10' }).setToken(token) as SyncRestClient
}

function getApplicationId(value: unknown): string {
  if (value && typeof value === 'object' && 'id' in value && typeof value.id === 'string') return value.id
  throw new Error('Could not resolve Discord application id')
}

export async function runSync(input: RunSyncInput): Promise<RunSyncResult> {
  const token = input.env?.DISCORD_TOKEN ?? process.env.DISCORD_TOKEN
  if (!token) throw new Error('DISCORD_TOKEN is required for vivere sync')

  const cwd = resolve(input.cwd)
  const configPath = join(cwd, 'vivere.config.ts')
  const config = await loadConfig(configPath)
  if (!input.global && !config.devGuildId) throw new Error('devGuildId is required for vivere sync')

  const configDir = dirname(configPath)
  const jiti = createJiti(pathToFileURL(configPath).href)
  const importer = (absPath: string) => jiti.import(absPath)
  const definitions = await resolveProjectDefinitions({
    baseDir: configDir,
    discovery: config.discovery,
    plugins: config.plugins,
    importer,
  })
  const commands = buildCommandTree(definitions.commands.map((command) => command.descriptor))
  const rest = (input.createRest ?? createDefaultRest)(token)
  const application = await rest.get(Routes.currentApplication())
  const applicationId = getApplicationId(application)
  const route = input.global
    ? Routes.applicationCommands(applicationId)
    : Routes.applicationGuildCommands(applicationId, config.devGuildId ?? '')

  await rest.put(route, { body: commands })
  return { commandCount: commands.length, scope: input.global ? 'global' : 'guild' }
}
