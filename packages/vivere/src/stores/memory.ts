import type { KeyValueStore, RateLimitStore, StoreInput, StorePorts } from './types.js'

interface MemoryKeyValueEntry {
  value: string
  expiresAt?: number
}

interface MemoryRateLimitEntry {
  count: number
  resetAt: number
}

export function createMemoryKeyValueStore(): KeyValueStore {
  const entries = new Map<string, MemoryKeyValueEntry>()

  return {
    async get(key) {
      const entry = entries.get(key)
      if (!entry) return undefined
      if (entry.expiresAt !== undefined && entry.expiresAt <= Date.now()) {
        entries.delete(key)
        return undefined
      }
      return entry.value
    },
    async set(key, value, options) {
      entries.set(key, {
        value,
        ...(options?.ttlMs !== undefined ? { expiresAt: Date.now() + options.ttlMs } : {}),
      })
    },
    async delete(key) {
      entries.delete(key)
    },
  }
}

export function createMemoryRateLimitStore(): RateLimitStore {
  const entries = new Map<string, MemoryRateLimitEntry>()

  return {
    async increment(key, windowMs) {
      const now = Date.now()
      const current = entries.get(key)
      if (!current || current.resetAt <= now) {
        const next = { count: 1, resetAt: now + windowMs }
        entries.set(key, next)
        return { count: next.count, resetAt: new Date(next.resetAt) }
      }

      current.count += 1
      return { count: current.count, resetAt: new Date(current.resetAt) }
    },
  }
}

export function createStorePorts(input: StoreInput = {}): StorePorts {
  return {
    kv: input.kv ?? createMemoryKeyValueStore(),
    rateLimit: input.rateLimit ?? createMemoryRateLimitStore(),
  }
}
