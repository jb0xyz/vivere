import type { Client } from 'discord.js'
import type { EventDefinition } from '../authoring/create-vivere.js'
import type { ErrorReporter } from '../internal/errors.js'
import { reportError as defaultReportError } from '../internal/errors.js'

export function registerEvents<TServices>(
  client: Client,
  events: EventDefinition<TServices>[],
  createServices: () => Promise<TServices>,
  reportError: ErrorReporter = defaultReportError,
): void {
  for (const event of events) {
    const listener = (...args: unknown[]) => {
      void Promise.resolve()
        .then(async () => {
          const services = await createServices()
          await event.execute({ services, client }, ...args)
        })
        .catch((error: unknown) => reportError(error, { phase: 'event', id: String(event.descriptor.name) }))
    }

    const register = event.descriptor.once ? client.once.bind(client) : client.on.bind(client)
    register(event.descriptor.name as never, listener as never)
  }
}
