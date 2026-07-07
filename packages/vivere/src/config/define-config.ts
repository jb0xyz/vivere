export interface VivereConfig {
  discovery: {
    commands: string
    events?: string
    components?: string
  }
  devGuildId?: string
}

export function defineConfig(config: VivereConfig): VivereConfig {
  return config
}
