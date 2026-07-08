import type { PluginDefinition } from '../authoring/create-vivere.js'

export interface VivereConfig<TServices = unknown> {
  discovery: {
    commands: string
    events?: string
    components?: string
  }
  devGuildId?: string
  plugins?: PluginDefinition<TServices>[]
  dev?: {
    entry?: string
  }
}

export function defineConfig<TServices = unknown>(config: VivereConfig<TServices>): VivereConfig<TServices> {
  return config
}
