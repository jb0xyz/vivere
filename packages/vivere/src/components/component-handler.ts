import type {
  ButtonDefinition,
  ComponentDefinition,
  ModalDefinition,
  SelectDefinition,
} from '../authoring/create-vivere.js'
import type { AnyMiddlewareDefinition } from '../authoring/middleware.js'
import type { ButtonContext, ComponentsBuilder, ModalContext, SelectContext } from '../authoring/types.js'
import type { ErrorReporter } from '../internal/errors.js'
import { reportError as defaultReportError } from '../internal/errors.js'
import { runWithMiddleware } from '../runtime/middleware.js'
import type { ComponentInteractionAdapter } from '../runtime/interaction-adapter.js'
import { createComponentsBuilder, createModalSpec } from './component-builder.js'
import { decodeCustomId } from './custom-id.js'

export type ComponentRegistry<TServices> = Map<string, ComponentDefinition<TServices>>

export interface ComponentHandlerDeps<TServices> {
  services: TServices
}

export function getComponentRegistryKey(componentKind: string, id: string): string {
  return `${componentKind}:${id}`
}

function isSelectDefinition<TServices>(
  component: ComponentDefinition<TServices>,
): component is SelectDefinition<TServices> {
  return component.descriptor.componentKind === 'select'
}

function isButtonDefinition<TServices>(
  component: ComponentDefinition<TServices>,
): component is ButtonDefinition<TServices> {
  return component.descriptor.componentKind === 'button'
}

function isModalDefinition<TServices>(
  component: ComponentDefinition<TServices>,
): component is ModalDefinition<TServices> {
  return component.descriptor.componentKind === 'modal'
}

export async function handleComponent<TServices>(
  adapter: ComponentInteractionAdapter,
  options: {
    registry: ComponentRegistry<TServices>
    secret: string
    deps: ComponentHandlerDeps<TServices>
    components?: ComponentsBuilder
    middleware?: AnyMiddlewareDefinition<TServices>[]
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

  try {
    const middleware = [...(options.middleware ?? []), ...(component.middleware ?? [])]
    const identity = {
      userId: adapter.userId ?? 'unknown',
      ...(adapter.guildId ? { guildId: adapter.guildId } : {}),
    }

    if (isModalDefinition(component)) {
      if (adapter.kind !== 'modal') return
      const fields = Object.fromEntries(
        component.descriptor.fields.map((field) => [field.name, adapter.fields[field.name] ?? '']),
      )
      const ctx: ModalContext<Record<string, unknown>, Record<string, string>, TServices> = {
        params,
        fields,
        services: options.deps.services,
        ...identity,
        reply: (input) => adapter.reply(input),
        defer: (input) => adapter.defer(input),
      }
      await runWithMiddleware({
        ctx,
        middleware,
        execute: (nextCtx) => component.execute(nextCtx),
        reportError,
        errorContext: { phase: 'component', kind: component.descriptor.componentKind, id: component.descriptor.id },
        replyUserError: (input) => adapter.reply(input),
      })
      return
    }

    if (adapter.kind === 'modal') return
    const components = options.components ?? createComponentsBuilder(options.secret)
    const baseCtx: ButtonContext<Record<string, unknown>, TServices> = {
      params,
      services: options.deps.services,
      ...identity,
      components,
      update: (input) => adapter.update(input),
      reply: (input) => adapter.reply(input),
      defer: () => adapter.deferUpdate(),
      showModal: (modal, input) => adapter.showModal(createModalSpec(options.secret, modal, input)),
    }

    if (isSelectDefinition(component)) {
      if (adapter.kind !== 'select') return
      const ctx: SelectContext<Record<string, unknown>, TServices> = {
        ...baseCtx,
        values: adapter.values,
      }
      await runWithMiddleware({
        ctx,
        middleware,
        execute: (nextCtx) => component.execute(nextCtx),
        reportError,
        errorContext: { phase: 'component', kind: component.descriptor.componentKind, id: component.descriptor.id },
        replyUserError: (input) => adapter.reply(input),
      })
      return
    }
    if (isButtonDefinition(component)) {
      await runWithMiddleware({
        ctx: baseCtx,
        middleware,
        execute: (nextCtx) => component.execute(nextCtx),
        reportError,
        errorContext: { phase: 'component', kind: component.descriptor.componentKind, id: component.descriptor.id },
        replyUserError: (input) => adapter.reply(input),
      })
    }
  } catch (error) {
    reportError(error, { phase: 'component', kind: component.descriptor.componentKind, id: component.descriptor.id })
  }
}
