import { readdir } from 'node:fs/promises'
import { basename, extname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { ButtonIR, CommandIR, EventIR } from '../authoring/create-vivere.js'

type DiscoverableIR = ButtonIR | CommandIR | EventIR

function isSourceFile(path: string): boolean {
  if (!/\.(ts|js)$/.test(path)) return false
  if (/\.d\.ts$/.test(path)) return false
  if (/\.test\./.test(path)) return false
  if (/\/index\.(ts|js)$/.test(path)) return false
  return true
}

async function collectFileList(dir: string): Promise<string[]> {
  const entryList = await readdir(dir, { withFileTypes: true })
  const fileList = await Promise.all(
    entryList.map(async (entry) => {
      const path = join(dir, entry.name)
      if (entry.isDirectory()) return collectFileList(path)
      if (entry.isFile() && isSourceFile(path)) return [path]
      return []
    }),
  )

  return fileList.flat().sort((a, b) => a.localeCompare(b))
}

async function importDefault(path: string): Promise<DiscoverableIR> {
  const mod = (await import(pathToFileURL(path).href)) as { default?: unknown }
  const value = mod.default
  if (!value || typeof value !== 'object' || !('kind' in value)) {
    throw new Error(`Expected default export from ${path}`)
  }
  return value as DiscoverableIR
}

function getFileBaseName(path: string): string {
  return basename(path, extname(path))
}

function assertUnique(items: readonly string[], label: string): void {
  const seen = new Set<string>()
  for (const item of items) {
    if (seen.has(item)) throw new Error(`Duplicate ${label} "${item}"`)
    seen.add(item)
  }
}

export async function discoverCommands<TServices = unknown>(dir: string): Promise<CommandIR<TServices>[]> {
  const fileList = await collectFileList(resolve(dir))
  const commandList = await Promise.all(
    fileList.map(async (file) => {
      const value = await importDefault(file)
      if (value.kind !== 'command') throw new Error(`Expected command default export from ${file}`)
      const fileName = getFileBaseName(file)
      if (value.name !== fileName) {
        throw new Error(`Command name "${value.name}" must match file name "${fileName}"`)
      }
      return value as CommandIR<TServices>
    }),
  )

  assertUnique(
    commandList.map((command) => command.name),
    'command name',
  )
  return commandList
}

export async function discoverEvents<TServices = unknown>(dir: string): Promise<EventIR<TServices>[]> {
  const fileList = await collectFileList(resolve(dir))
  return Promise.all(
    fileList.map(async (file) => {
      const value = await importDefault(file)
      if (value.kind !== 'event') throw new Error(`Expected event default export from ${file}`)
      return value as EventIR<TServices>
    }),
  )
}

export async function discoverButtons<TServices = unknown>(dir: string): Promise<ButtonIR<TServices>[]> {
  const fileList = await collectFileList(resolve(dir))
  const buttonList = await Promise.all(
    fileList.map(async (file) => {
      const value = await importDefault(file)
      if (value.kind !== 'button') throw new Error(`Expected button default export from ${file}`)
      return value as ButtonIR<TServices>
    }),
  )

  assertUnique(
    buttonList.map((button) => button.id),
    'button id',
  )
  return buttonList
}
