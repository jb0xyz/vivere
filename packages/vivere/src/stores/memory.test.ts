import { afterEach, expect, test, vi } from 'vitest'
import { createMemoryKeyValueStore, createMemoryRateLimitStore } from './memory.js'

afterEach(() => {
  vi.useRealTimers()
})

test('stores and deletes key-value entries', async () => {
  const store = createMemoryKeyValueStore()

  await store.set('session:user-1', 'open')
  expect(await store.get('session:user-1')).toBe('open')

  await store.delete('session:user-1')
  expect(await store.get('session:user-1')).toBeUndefined()
})

test('expires key-value entries lazily on read', async () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
  const store = createMemoryKeyValueStore()

  await store.set('session:user-1', 'open', { ttlMs: 100 })
  expect(await store.get('session:user-1')).toBe('open')

  vi.advanceTimersByTime(101)
  expect(await store.get('session:user-1')).toBeUndefined()
})

test('counts rate limit hits inside the active window', async () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
  const store = createMemoryRateLimitStore()

  const first = await store.increment('user-1', 1000)
  const second = await store.increment('user-1', 1000)

  expect(first).toEqual({ count: 1, resetAt: new Date('2026-01-01T00:00:01.000Z') })
  expect(second).toEqual({ count: 2, resetAt: first.resetAt })
})

test('starts a new rate limit window after reset', async () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
  const store = createMemoryRateLimitStore()

  await store.increment('user-1', 1000)
  vi.advanceTimersByTime(1001)
  const next = await store.increment('user-1', 1000)

  expect(next).toEqual({ count: 1, resetAt: new Date('2026-01-01T00:00:02.001Z') })
})
