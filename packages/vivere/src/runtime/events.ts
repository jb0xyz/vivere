import type { Client } from 'discord.js'
import type { EventIR } from '../authoring/create-vivere.js'

export function registerEvents<TServices>(
  client: Client,
  events: EventIR<TServices>[],
  createServices: () => Promise<TServices>,
): void {
  for (const event of events) {
    const listener = (...args: unknown[]) => {
      void Promise.resolve()
        .then(async () => {
          const services = await createServices()
          await event.execute({ services, client }, ...args)
        })
        .catch((error: unknown) => console.error(error))
    }

    const register = event.once ? client.once.bind(client) : client.on.bind(client)
    register(event.name as never, listener as never)
  }
}
