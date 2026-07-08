import type { ButtonDefinition } from '../authoring/create-vivere.js'
import type { ButtonContext, ComponentsBuilder } from '../authoring/types.js'
import type { ErrorReporter } from '../internal/errors.js'
import { reportError as defaultReportError } from '../internal/errors.js'
import type { ComponentInteractionAdapter } from '../runtime/interaction-adapter.js'
import { createComponentsBuilder } from './component-builder.js'
import { decodeCustomId } from './custom-id.js'

export type ComponentDefinition<TServices> = ButtonDefinition<TServices>
export type ComponentRegistry<TServices> = Map<string, ComponentDefinition<TServices>>

export interface ComponentHandlerDeps<TServices> {
  services: TServices
}

export function getComponentRegistryKey(componentKind: string, id: string): string {
  return `${componentKind}:${id}`
}

export async function handleComponent<TServices>(
  adapter: ComponentInteractionAdapter,
  options: {
    registry: ComponentRegistry<TServices>
    secret: string
    deps: ComponentHandlerDeps<TServices>
    components?: ComponentsBuilder
    reportError?: ErrorReporter
  },
): Promise<void> {
  const reportError = options.reportError ?? defaultReportError
  let decoded: { componentKind: string; id: string; params: Record<string, string> }
  try {
    decoded = decodeCustomId(adapter.customId, options.secret)
  } catch (error) {
    reportError(error, { phase: 'component', kind: adapter.kind })
    return
  }

  if (decoded.componentKind !== adapter.kind) {
    reportError(`Mismatched component customId kind: ${decoded.componentKind}`, {
      phase: 'component',
      kind: adapter.kind,
      id: decoded.id,
    })
    return
  }

  const component = options.registry.get(getComponentRegistryKey(decoded.componentKind, decoded.id))
  if (!component) {
    reportError(`Unknown component customId: ${decoded.componentKind}:${decoded.id}`, {
      phase: 'component',
      kind: decoded.componentKind,
      id: decoded.id,
    })
    return
  }

  const params: Record<string, unknown> = {}
  try {
    for (const [key, codec] of Object.entries(component.codecs)) {
      const raw = decoded.params[key]
      if (raw === undefined) throw new Error(`Missing component param: ${key}`)
      params[key] = codec.decode(raw)
    }
  } catch (error) {
    reportError(error, { phase: 'component', kind: component.descriptor.componentKind, id: component.descriptor.id })
    return
  }

  const ctx: ButtonContext<Record<string, unknown>, TServices> = {
    params,
    services: options.deps.services,
    components: options.components ?? createComponentsBuilder(options.secret),
    update: (input) => adapter.update(input),
    reply: (input) => adapter.reply(input),
    defer: () => adapter.deferUpdate(),
  }

  try {
    await component.execute(ctx)
  } catch (error) {
    reportError(error, { phase: 'component', kind: component.descriptor.componentKind, id: component.descriptor.id })
  }
}
