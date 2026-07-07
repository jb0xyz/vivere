import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createJiti } from 'jiti'
import type { VivereConfig } from '../config/define-config.js'
import { discoverButtons, discoverCommands, discoverEvents } from '../discovery/discover.js'
import { buildManifest, manifestToJson } from '../manifest/manifest.js'

export interface RunBuildInput {
  cwd: string
  check: boolean
}

export interface RunBuildResult {
  manifestPath: string
  changed: boolean
}

async function readExistingManifest(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, 'utf8')
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') return undefined
    throw error
  }
}

async function loadConfig(configPath: string): Promise<VivereConfig> {
  const jiti = createJiti(pathToFileURL(configPath).href)
  return jiti.import<VivereConfig>(configPath, { default: true })
}

export async function runBuild(input: RunBuildInput): Promise<RunBuildResult> {
  const cwd = resolve(input.cwd)
  const configPath = join(cwd, 'vivere.config.ts')
  const config = await loadConfig(configPath)
  const configDir = dirname(configPath)
  const jiti = createJiti(pathToFileURL(configPath).href)
  const importer = (absPath: string) => jiti.import(absPath)

  const commands = await discoverCommands(resolve(configDir, config.discovery.commands), { import: importer })
  const events = config.discovery.events
    ? await discoverEvents(resolve(configDir, config.discovery.events), { import: importer })
    : []
  const buttons = config.discovery.components
    ? await discoverButtons(resolve(configDir, config.discovery.components), { import: importer })
    : []
  const manifestJson = manifestToJson(buildManifest({ commands, events, buttons }))
  const manifestPath = join(cwd, '.vivere/manifest.json')
  const existingManifest = await readExistingManifest(manifestPath)
  const changed = existingManifest !== manifestJson

  if (!input.check) {
    await mkdir(dirname(manifestPath), { recursive: true })
    await writeFile(manifestPath, manifestJson)
  }

  return { manifestPath, changed }
}
