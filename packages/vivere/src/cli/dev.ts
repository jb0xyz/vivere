import { spawn } from 'node:child_process'
import type { ChildProcess } from 'node:child_process'
import { watch } from 'node:fs'
import type { FSWatcher, WatchListener } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createJiti } from 'jiti'
import type { VivereConfig } from '../config/define-config.js'

export interface RunDevInput {
  cwd: string
  env?: NodeJS.ProcessEnv
  spawnProcess?: SpawnDevProcess
}

export interface DevPlan {
  entryPath: string
  watchPathList: string[]
}

export interface DevChildProcess {
  kill(signal?: NodeJS.Signals): boolean
}

export type SpawnDevProcess = (
  entryPath: string,
  cwd: string,
  env: NodeJS.ProcessEnv,
) => DevChildProcess

export interface CreateDevProcessManagerInput {
  cwd: string
  entryPath: string
  env: NodeJS.ProcessEnv
  spawnProcess: SpawnDevProcess
}

async function loadConfig(configPath: string): Promise<VivereConfig> {
  const jiti = createJiti(pathToFileURL(configPath).href)
  return jiti.import<VivereConfig>(configPath, { default: true })
}

function getDiscoveryPathList(config: VivereConfig): string[] {
  return [
    config.discovery.commands,
    config.discovery.events,
    config.discovery.components,
  ].filter((item): item is string => Boolean(item))
}

function uniquePathList(pathList: string[]): string[] {
  return Array.from(new Set(pathList))
}

export function createDevPlan(input: { cwd: string; config: VivereConfig }): DevPlan {
  const cwd = resolve(input.cwd)
  const entryPath = resolve(cwd, input.config.dev?.entry ?? 'src/index.ts')
  const watchPathList = uniquePathList([
    resolve(cwd, 'vivere.config.ts'),
    entryPath,
    ...getDiscoveryPathList(input.config).map((path) => resolve(cwd, path)),
  ])
  return { entryPath, watchPathList }
}

function spawnDefaultDevProcess(entryPath: string, cwd: string, env: NodeJS.ProcessEnv): ChildProcess {
  const code = [
    "const { createJiti } = require('jiti')",
    "const jiti = createJiti(process.cwd() + '/')",
    `jiti.import(${JSON.stringify(entryPath)}).catch((error) => { console.error(error); process.exit(1) })`,
  ].join(';')
  return spawn(process.execPath, ['-e', code], {
    cwd,
    env: { ...process.env, ...env },
    stdio: 'inherit',
  })
}

export function createDevProcessManager(input: CreateDevProcessManagerInput) {
  let child: DevChildProcess | undefined

  function start(): void {
    child = input.spawnProcess(input.entryPath, input.cwd, input.env)
  }

  function stop(): void {
    child?.kill('SIGTERM')
    child = undefined
  }

  function restart(): void {
    stop()
    start()
  }

  return { start, restart, stop }
}

function createWatcher(path: string, listener: WatchListener<string>): FSWatcher | undefined {
  try {
    return watch(path, { recursive: true }, listener)
  } catch {
    try {
      return watch(path, listener)
    } catch {
      return undefined
    }
  }
}

export async function runDev(input: RunDevInput): Promise<void> {
  const cwd = resolve(input.cwd)
  const configPath = join(cwd, 'vivere.config.ts')
  const config = await loadConfig(configPath)
  const plan = createDevPlan({ cwd, config })
  const manager = createDevProcessManager({
    cwd,
    entryPath: plan.entryPath,
    env: input.env ?? process.env,
    spawnProcess: input.spawnProcess ?? spawnDefaultDevProcess,
  })
  let timer: NodeJS.Timeout | undefined
  const watcherList = plan.watchPathList
    .map((path) =>
      createWatcher(path, () => {
        if (timer) clearTimeout(timer)
        timer = setTimeout(() => manager.restart(), 100)
      }),
    )
    .filter((item): item is FSWatcher => Boolean(item))

  manager.start()

  await new Promise<void>((resolvePromise) => {
    const stop = () => {
      if (timer) clearTimeout(timer)
      for (const watcher of watcherList) watcher.close()
      manager.stop()
      process.off('SIGINT', stop)
      process.off('SIGTERM', stop)
      resolvePromise()
    }
    process.once('SIGINT', stop)
    process.once('SIGTERM', stop)
  })
}
