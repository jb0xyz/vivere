import type { ButtonIR, CommandIR, EventIR } from '../authoring/create-vivere.js'
import { serializeCommand, type SerializedCommand } from './serialize.js'

export interface SerializedEvent {
  name: string
  once: boolean
}

export interface SerializedButtonParam {
  name: string
  kind: string
}

export interface SerializedButton {
  id: string
  params: SerializedButtonParam[]
}

export interface Manifest {
  schemaVersion: 1
  commands: SerializedCommand[]
  events: SerializedEvent[]
  buttons: SerializedButton[]
}

export interface BuildManifestInput {
  commands: CommandIR[]
  events: EventIR[]
  buttons: ButtonIR[]
}

export function serializeEvent(event: EventIR): SerializedEvent {
  return {
    name: String(event.name),
    once: event.once,
  }
}

export function serializeButton(button: ButtonIR): SerializedButton {
  const params = Object.entries(button.params)
    .map(([name, node]) => ({ name, kind: node.kind }))
    .sort((a, b) => a.name.localeCompare(b.name))

  return {
    id: button.id,
    params,
  }
}

export function buildManifest(input: BuildManifestInput): Manifest {
  return {
    schemaVersion: 1,
    commands: input.commands.map(serializeCommand).sort((a, b) => a.name.localeCompare(b.name)),
    events: input.events
      .map(serializeEvent)
      .sort((a, b) => a.name.localeCompare(b.name) || Number(a.once) - Number(b.once)),
    buttons: input.buttons.map(serializeButton).sort((a, b) => a.id.localeCompare(b.id)),
  }
}

export function manifestToJson(manifest: Manifest): string {
  return JSON.stringify(manifest, null, 2)
}
