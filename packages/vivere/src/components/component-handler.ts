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
import { createStorePorts } from '../stores/memory.js'
import type { StorePorts } from '../stores/types.js'
import { getDurationMs, ignoreVivereEvent } from '../internal/observability.js'
import type { VivereEventSink } from '../internal/observability.js'
import { createComponentsBuilder, createModalSpec } from './component-builder.js'
import { decodeCustomId } from './custom-id.js'

export type ComponentRegistry<TServices> = Map<string, ComponentDefinition<TServices>>

export interface ComponentHandlerDeps<TServices> {
  services: TServices
  stores?: StorePorts
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
    stores?: StorePorts
    components?: ComponentsBuilder
    middleware?: AnyMiddlewareDefinition<TServices>[]
    reportError?: ErrorReporter
    onEvent?: VivereEventSink
  },
): Promise<void> {
  const reportError = options.reportError ?? defaultReportError
  const onEvent = options.onEvent ?? ignoreVivereEvent
  const stores = options.stores ?? options.deps.stores ?? createStorePorts()
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
  const startedAt = Date.now()
  onEvent({ type: 'component.started', kind: component.descriptor.componentKind, id: component.descriptor.id })

  const params: Record<string, unknown> = {}
  try {
    for (const [key, codec] of Object.entries(component.codecs)) {
      const raw = decoded.params[key]
      if (raw === undefined) throw new Error(`Missing component param: ${key}`)
      params[key] = codec.decode(raw)
    }
  } catch (error) {
    const durationMs = getDurationMs(startedAt)
    reportError(error, { phase: 'component', kind: component.descriptor.componentKind, id: component.descriptor.id })
    onEvent({ type: 'component.failed', kind: component.descriptor.componentKind, id: component.descriptor.id, durationMs })
    onEvent({
      type: 'component.finished',
      kind: component.descriptor.componentKind,
      id: component.descriptor.id,
      durationMs,
      outcome: 'error',
    })
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
        stores,
        ...identity,
        reply: (input) => adapter.reply(input),
        defer: (input) => adapter.defer(input),
      }
      const result = await runWithMiddleware({
        ctx,
        middleware,
        execute: (nextCtx) => component.execute(nextCtx),
        reportError,
        errorContext: { phase: 'component', kind: component.descriptor.componentKind, id: component.descriptor.id },
        replyUserError: (input) => adapter.reply(input),
      })
      const durationMs = getDurationMs(startedAt)
      if (result.outcome === 'error') {
        onEvent({ type: 'component.failed', kind: component.descriptor.componentKind, id: component.descriptor.id, durationMs })
      }
      onEvent({
        type: 'component.finished',
        kind: component.descriptor.componentKind,
        id: component.descriptor.id,
        durationMs,
        outcome: result.outcome,
      })
      return
    }

    if (adapter.kind === 'modal') return
    const components = options.components ?? createComponentsBuilder(options.secret)
    const baseCtx: ButtonContext<Record<string, unknown>, TServices> = {
      params,
      services: options.deps.services,
      stores,
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
      const result = await runWithMiddleware({
        ctx,
        middleware,
        execute: (nextCtx) => component.execute(nextCtx),
        reportError,
        errorContext: { phase: 'component', kind: component.descriptor.componentKind, id: component.descriptor.id },
        replyUserError: (input) => adapter.reply(input),
      })
      const durationMs = getDurationMs(startedAt)
      if (result.outcome === 'error') {
        onEvent({ type: 'component.failed', kind: component.descriptor.componentKind, id: component.descriptor.id, durationMs })
      }
      onEvent({
        type: 'component.finished',
        kind: component.descriptor.componentKind,
        id: component.descriptor.id,
        durationMs,
        outcome: result.outcome,
      })
      return
    }
    if (isButtonDefinition(component)) {
      const result = await runWithMiddleware({
        ctx: baseCtx,
        middleware,
        execute: (nextCtx) => component.execute(nextCtx),
        reportError,
        errorContext: { phase: 'component', kind: component.descriptor.componentKind, id: component.descriptor.id },
        replyUserError: (input) => adapter.reply(input),
      })
      const durationMs = getDurationMs(startedAt)
      if (result.outcome === 'error') {
        onEvent({ type: 'component.failed', kind: component.descriptor.componentKind, id: component.descriptor.id, durationMs })
      }
      onEvent({
        type: 'component.finished',
        kind: component.descriptor.componentKind,
        id: component.descriptor.id,
        durationMs,
        outcome: result.outcome,
      })
    }
  } catch (error) {
    const durationMs = getDurationMs(startedAt)
    reportError(error, { phase: 'component', kind: component.descriptor.componentKind, id: component.descriptor.id })
    onEvent({ type: 'component.failed', kind: component.descriptor.componentKind, id: component.descriptor.id, durationMs })
    onEvent({
      type: 'component.finished',
      kind: component.descriptor.componentKind,
      id: component.descriptor.id,
      durationMs,
      outcome: 'error',
    })
  }
}
