import type { PluginDefinition } from '../authoring/create-vivere.js'
import type { AnyMiddlewareDefinition } from '../authoring/middleware.js'

export interface VivereConfig<TServices = unknown> {
  discovery: {
    commands: string
    events?: string
    components?: string
  }
  devGuildId?: string
  plugins?: PluginDefinition<TServices>[]
  middleware?: AnyMiddlewareDefinition<TServices>[]
  dev?: {
    entry?: string
  }
}

export function defineConfig<TServices = unknown>(config: VivereConfig<TServices>): VivereConfig<TServices> {
  return config
}
