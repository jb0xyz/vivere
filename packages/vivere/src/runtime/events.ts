import type { Client } from 'discord.js'
import type { EventDefinition } from '../authoring/create-vivere.js'
import type { AnyMiddlewareDefinition } from '../authoring/middleware.js'
import type { ErrorReporter } from '../internal/errors.js'
import { reportError as defaultReportError } from '../internal/errors.js'
import { createStorePorts } from '../stores/memory.js'
import type { StorePorts } from '../stores/types.js'
import { runWithMiddleware } from './middleware.js'

export function registerEvents<TServices>(
  client: Client,
  events: EventDefinition<TServices>[],
  createServices: () => Promise<TServices>,
  reportError: ErrorReporter = defaultReportError,
  middleware: AnyMiddlewareDefinition<TServices>[] = [],
  stores: StorePorts = createStorePorts(),
): void {
  for (const event of events) {
    const listener = (...args: unknown[]) => {
      void Promise.resolve()
        .then(async () => {
          const services = await createServices()
          const ctx = { services, stores, client, userId: 'system' }
          await runWithMiddleware({
            ctx,
            middleware: [...middleware, ...event.middleware],
            execute: (nextCtx) => event.execute(nextCtx, ...args),
            reportError,
            errorContext: { phase: 'event', id: String(event.descriptor.name) },
          })
        })
        .catch((error: unknown) => reportError(error, { phase: 'event', id: String(event.descriptor.name) }))
    }

    const register = event.descriptor.once ? client.once.bind(client) : client.on.bind(client)
    register(event.descriptor.name as never, listener as never)
  }
}
