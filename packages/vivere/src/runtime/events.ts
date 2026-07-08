import type { Client } from 'discord.js'
import type { EventDefinition } from '../authoring/create-vivere.js'
import type { AnyMiddlewareDefinition } from '../authoring/middleware.js'
import type { ErrorReporter } from '../internal/errors.js'
import { reportError as defaultReportError } from '../internal/errors.js'
import { createStorePorts } from '../stores/memory.js'
import type { StorePorts } from '../stores/types.js'
import { getDurationMs, ignoreVivereEvent } from '../internal/observability.js'
import type { VivereEventSink } from '../internal/observability.js'
import { runWithMiddleware } from './middleware.js'

export function registerEvents<TServices>(
  client: Client,
  events: EventDefinition<TServices>[],
  createServices: () => Promise<TServices>,
  reportError: ErrorReporter = defaultReportError,
  middleware: AnyMiddlewareDefinition<TServices>[] = [],
  stores: StorePorts = createStorePorts(),
  onEvent: VivereEventSink = ignoreVivereEvent,
): void {
  for (const event of events) {
    const listener = (...args: unknown[]) => {
      const name = String(event.descriptor.name)
      const startedAt = Date.now()
      onEvent({ type: 'event.started', name })
      void Promise.resolve()
        .then(async () => {
          const services = await createServices()
          const ctx = { services, stores, client, userId: 'system' }
          const result = await runWithMiddleware({
            ctx,
            middleware: [...middleware, ...event.middleware],
            execute: (nextCtx) => event.execute(nextCtx, ...args),
            reportError,
            errorContext: { phase: 'event', id: name },
          })
          const durationMs = getDurationMs(startedAt)
          if (result.outcome === 'error') {
            onEvent({ type: 'event.failed', name, durationMs })
            return
          }
          onEvent({ type: 'event.handled', name, durationMs })
        })
        .catch((error: unknown) => {
          onEvent({ type: 'event.failed', name, durationMs: getDurationMs(startedAt) })
          reportError(error, { phase: 'event', id: name })
        })
    }

    const register = event.descriptor.once ? client.once.bind(client) : client.on.bind(client)
    register(event.descriptor.name as never, listener as never)
  }
}
