import type { CommandDescriptor, ComponentDescriptor, EventDescriptor, ParamDescriptor } from '../authoring/ir.js'
import { serializeCommand, type SerializedCommand } from './serialize.js'

export type SerializedEvent = EventDescriptor

export type SerializedButtonParam = ParamDescriptor

export type SerializedComponent = ComponentDescriptor

export interface Manifest {
  schemaVersion: 1
  commands: SerializedCommand[]
  events: SerializedEvent[]
  components: SerializedComponent[]
}

export interface BuildManifestInput {
  commands: CommandDescriptor[]
  events: EventDescriptor[]
  components: ComponentDescriptor[]
}

export function serializeEvent(event: EventDescriptor): SerializedEvent {
  return { ...event }
}

export function serializeComponent(component: ComponentDescriptor): SerializedComponent {
  const params = component.params
    .map((param) => ({
      name: param.name,
      kind: param.kind,
      ...(param.maxLength === undefined ? {} : { maxLength: param.maxLength }),
      ...(param.values === undefined ? {} : { values: [...param.values] }),
    }))
    .sort((a, b) => a.name.localeCompare(b.name))

  return {
    ...component,
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
    components: input.components
      .map(serializeComponent)
      .sort((a, b) => a.componentKind.localeCompare(b.componentKind) || a.id.localeCompare(b.id)),
  }
}

export function manifestToJson(manifest: Manifest): string {
  return JSON.stringify(manifest, null, 2)
}
