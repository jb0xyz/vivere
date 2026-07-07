import type { ButtonDescriptor, CommandDescriptor, EventDescriptor, ParamDescriptor } from '../authoring/ir.js'
import { serializeCommand, type SerializedCommand } from './serialize.js'

export type SerializedEvent = EventDescriptor

export type SerializedButtonParam = ParamDescriptor

export type SerializedButton = ButtonDescriptor

export interface Manifest {
  schemaVersion: 1
  commands: SerializedCommand[]
  events: SerializedEvent[]
  buttons: SerializedButton[]
}

export interface BuildManifestInput {
  commands: CommandDescriptor[]
  events: EventDescriptor[]
  buttons: ButtonDescriptor[]
}

export function serializeEvent(event: EventDescriptor): SerializedEvent {
  return { ...event }
}

export function serializeButton(button: ButtonDescriptor): SerializedButton {
  const params = button.params
    .map((param) => ({
      name: param.name,
      kind: param.kind,
      ...(param.maxLength === undefined ? {} : { maxLength: param.maxLength }),
      ...(param.values === undefined ? {} : { values: [...param.values] }),
    }))
    .sort((a, b) => a.name.localeCompare(b.name))

  return {
    ...button,
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
