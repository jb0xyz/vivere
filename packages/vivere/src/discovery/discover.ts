import { readdir } from 'node:fs/promises'
import { basename, extname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import type {
  ButtonDefinition,
  CommandDefinition,
  ComponentDefinition,
  EventDefinition,
  SelectDefinition,
} from '../authoring/create-vivere.js'
import { assertUnique } from '../internal/collections.js'

type DiscoverableDefinition = ButtonDefinition | CommandDefinition | EventDefinition | SelectDefinition
type DefinitionKind = DiscoverableDefinition['descriptor']['kind']
type DefinitionByKind<TServices, TKind extends DefinitionKind> = TKind extends 'command'
  ? CommandDefinition<TServices>
  : TKind extends 'event'
    ? EventDefinition<TServices>
    : TKind extends 'button'
      ? ButtonDefinition<TServices>
      : SelectDefinition<TServices>

export interface DiscoverOptions {
  import?: (absPath: string) => Promise<unknown>
}

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

async function nativeImport(absPath: string): Promise<unknown> {
  return import(pathToFileURL(absPath).href)
}

async function importDefault(path: string, importer: (absPath: string) => Promise<unknown>): Promise<DiscoverableDefinition> {
  const mod = await importer(path)
  const value = mod && typeof mod === 'object' && 'default' in mod ? mod.default : mod
  if (!value || typeof value !== 'object' || !('descriptor' in value)) {
    throw new Error(`Expected default export from ${path}`)
  }
  return value as DiscoverableDefinition
}

function getFileBaseName(path: string): string {
  return basename(path, extname(path))
}

async function discover<TServices, TKind extends DefinitionKind>(
  dir: string,
  kind: TKind,
  options: DiscoverOptions = {},
): Promise<Array<DefinitionByKind<TServices, TKind>>> {
  const importer = options.import ?? nativeImport
  const fileList = await collectFileList(resolve(dir))
  const definitionList = await Promise.all(
    fileList.map(async (file) => {
      const value = await importDefault(file, importer)
      if (value.descriptor.kind !== kind) throw new Error(`Expected ${kind} default export from ${file}`)
      if (kind === 'command') {
        const command = value as CommandDefinition<TServices>
        const fileName = getFileBaseName(file)
        if (command.descriptor.name !== fileName) {
          throw new Error(`Command name "${command.descriptor.name}" must match file name "${fileName}"`)
        }
      }
      return value as DefinitionByKind<TServices, TKind>
    }),
  )

  if (kind === 'command') {
    assertUnique(
      definitionList.map((definition) => (definition as CommandDefinition<TServices>).descriptor.name),
      'command name',
    )
  }
  if (kind === 'button') {
    assertUnique(
      definitionList.map((definition) => (definition as ButtonDefinition<TServices>).descriptor.id),
      'button id',
    )
  }

  return definitionList
}

async function discoverComponentDefinitions<TServices>(
  dir: string,
  options: DiscoverOptions = {},
): Promise<ComponentDefinition<TServices>[]> {
  const importer = options.import ?? nativeImport
  const fileList = await collectFileList(resolve(dir))
  const definitionList = await Promise.all(
    fileList.map(async (file) => {
      const value = await importDefault(file, importer)
      if (value.descriptor.kind !== 'button' && value.descriptor.kind !== 'select') {
        throw new Error(`Expected component default export from ${file}`)
      }
      return value as ComponentDefinition<TServices>
    }),
  )

  assertUnique(
    definitionList.map((definition) =>
      `${definition.descriptor.componentKind}:${definition.descriptor.id}`,
    ),
    'component id',
  )

  return definitionList
}

export async function discoverCommands<TServices = unknown>(
  dir: string,
  options: DiscoverOptions = {},
): Promise<CommandDefinition<TServices>[]> {
  return discover<TServices, 'command'>(dir, 'command', options)
}

export async function discoverEvents<TServices = unknown>(
  dir: string,
  options: DiscoverOptions = {},
): Promise<EventDefinition<TServices>[]> {
  return discover<TServices, 'event'>(dir, 'event', options)
}

export async function discoverButtons<TServices = unknown>(
  dir: string,
  options: DiscoverOptions = {},
): Promise<ButtonDefinition<TServices>[]> {
  return discover<TServices, 'button'>(dir, 'button', options)
}

export async function discoverComponents<TServices = unknown>(
  dir: string,
  options: DiscoverOptions = {},
): Promise<ComponentDefinition<TServices>[]> {
  return discoverComponentDefinitions<TServices>(dir, options)
}
