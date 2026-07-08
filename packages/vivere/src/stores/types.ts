export interface KeyValueSetOptions {
  ttlMs?: number
}

export interface KeyValueStore {
  get(key: string): Promise<string | undefined>
  set(key: string, value: string, options?: KeyValueSetOptions): Promise<void>
  delete(key: string): Promise<void>
}

export interface RateLimitResult {
  count: number
  resetAt: Date
}

export interface RateLimitStore {
  increment(key: string, windowMs: number): Promise<RateLimitResult>
}

export interface StorePorts {
  kv: KeyValueStore
  rateLimit: RateLimitStore
}

export interface StoreInput {
  kv?: KeyValueStore
  rateLimit?: RateLimitStore
}
