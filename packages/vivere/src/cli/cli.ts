import type { RunBuildInput, RunBuildResult } from './build.js'
import { runBuild as defaultRunBuild } from './build.js'
import type { RunSyncInput, RunSyncResult } from './sync.js'
import { runSync as defaultRunSync } from './sync.js'

const USAGE = 'Usage: vivere <build|sync>'

export type CliCommand =
  | { kind: 'build'; check: boolean }
  | { kind: 'sync'; global: boolean }
  | { kind: 'usage'; message: string }

export interface RunCliOptions {
  cwd: string
  runBuild?: (input: RunBuildInput) => Promise<RunBuildResult>
  runSync?: (input: RunSyncInput) => Promise<RunSyncResult>
  writeOut?: (message: string) => void
  writeErr?: (message: string) => void
}

export function parseCliArgs(argv: string[]): CliCommand {
  const [command, ...args] = argv
  if (!command) return { kind: 'usage', message: USAGE }
  if (command !== 'build' && command !== 'sync') return { kind: 'usage', message: `Unknown command: ${command}\n${USAGE}` }

  if (command === 'sync') {
    let global = false
    for (const arg of args) {
      if (arg === '--global') {
        global = true
        continue
      }
      return { kind: 'usage', message: `Unknown option: ${arg}\n${USAGE}` }
    }
    return { kind: 'sync', global }
  }

  let check = false
  for (const arg of args) {
    if (arg === '--check') {
      check = true
      continue
    }
    return { kind: 'usage', message: `Unknown option: ${arg}\n${USAGE}` }
  }

  return { kind: 'build', check }
}

export async function runCli(argv: string[], options: RunCliOptions): Promise<number> {
  const command = parseCliArgs(argv)
  const writeOut = options.writeOut ?? ((message) => process.stdout.write(message))
  const writeErr = options.writeErr ?? ((message) => process.stderr.write(message))
  if (command.kind === 'usage') {
    writeErr(`${command.message}\n`)
    return 1
  }

  if (command.kind === 'sync') {
    const runSync = options.runSync ?? defaultRunSync
    const result = await runSync({ cwd: options.cwd, global: command.global })
    writeOut(`Synced ${result.commandCount} commands to ${result.scope}\n`)
    return 0
  }

  const runBuild = options.runBuild ?? defaultRunBuild
  const result = await runBuild({ cwd: options.cwd, check: command.check })
  if (command.check && result.changed) {
    writeErr(`Manifest is out of date: ${result.manifestPath}\n`)
    return 1
  }

  if (result.changed) {
    writeOut(`Wrote manifest: ${result.manifestPath}\n`)
    return 0
  }

  writeOut(`Manifest is up to date: ${result.manifestPath}\n`)
  return 0
}
