import type { CommandIR } from '../authoring/create-vivere.js'

export interface SerializedOption {
  name: string
  kind: string
  required: boolean
}

export interface SerializedCommand {
  kind: 'command'
  name: string
  options: SerializedOption[]
}

/** camelCase property key → kebab-case Discord option name. */
export function toDiscordName(key: string): string {
  return key.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
}

export function serializeCommand(ir: CommandIR): SerializedCommand {
  const options = Object.entries(ir.options)
    .map(([key, node]) => ({
      name: toDiscordName(key),
      kind: node.kind,
      required: node.presence === 'required',
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
  return { kind: 'command', name: ir.name, options }
}
