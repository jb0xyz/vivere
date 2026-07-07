import type { RunBuildInput, RunBuildResult } from './build.js'
import { runBuild as defaultRunBuild } from './build.js'

const USAGE = 'Usage: vivere build [--check]'

export type CliCommand = { kind: 'build'; check: boolean } | { kind: 'usage'; message: string }

export interface RunCliOptions {
  cwd: string
  runBuild?: (input: RunBuildInput) => Promise<RunBuildResult>
  writeOut?: (message: string) => void
  writeErr?: (message: string) => void
}

export function parseCliArgs(argv: string[]): CliCommand {
  const [command, ...args] = argv
  if (!command) return { kind: 'usage', message: USAGE }
  if (command !== 'build') return { kind: 'usage', message: `Unknown command: ${command}\n${USAGE}` }

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
