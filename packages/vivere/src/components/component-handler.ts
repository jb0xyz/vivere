import type { ButtonDefinition } from '../authoring/create-vivere.js'
import type { ButtonContext } from '../authoring/types.js'
import type { ComponentInteractionAdapter } from '../runtime/interaction-adapter.js'
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
  },
): Promise<void> {
  let decoded: { componentKind: string; id: string; params: Record<string, string> }
  try {
    decoded = decodeCustomId(adapter.customId, options.secret)
  } catch (error) {
    console.warn(error)
    return
  }

  if (decoded.componentKind !== adapter.kind) {
    console.warn(`Mismatched component customId kind: ${decoded.componentKind}`)
    return
  }

  const component = options.registry.get(getComponentRegistryKey(decoded.componentKind, decoded.id))
  if (!component) {
    console.warn(`Unknown component customId: ${decoded.componentKind}:${decoded.id}`)
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
    console.warn(error)
    return
  }

  const ctx: ButtonContext<Record<string, unknown>, TServices> = {
    params,
    services: options.deps.services,
    update: (input) => adapter.update(input),
    reply: (input) => adapter.reply(input),
    defer: () => adapter.deferUpdate(),
  }

  await component.execute(ctx)
}
