import type { MiddlewareContext } from './middleware.js'
import { VivereUserError } from './middleware.js'
import type { PolicyDescriptor, PolicyScope } from './ir.js'

export type { PolicyDescriptor, PolicyScope } from './ir.js'

export interface PolicyTarget {
  kind: 'command' | 'component'
  id: string
}

export interface PolicyDefinition {
  readonly descriptor: PolicyDescriptor
  enforce(ctx: MiddlewareContext, target: PolicyTarget): Promise<void> | void
}

export interface CooldownPolicyInput {
  scope: PolicyScope
  window: string | number
}

export interface RateLimitPolicyInput {
  scope: PolicyScope
  limit: number
  window: string | number
}

const DURATION_PATTERN = /^(\d+)(ms|s|m|h)$/
const DURATION_UNIT = {
  ms: 1,
  s: 1000,
  m: 60_000,
  h: 3_600_000,
}

function getDurationMs(input: string | number): number {
  if (typeof input === 'number') {
    if (!Number.isFinite(input) || input <= 0) throw new Error(`Invalid duration: ${input}`)
    return input
  }

  const match = DURATION_PATTERN.exec(input)
  if (!match) throw new Error(`Invalid duration: ${input}`)

  return Number(match[1]) * DURATION_UNIT[match[2] as keyof typeof DURATION_UNIT]
}

function getScopeValue(ctx: MiddlewareContext, scope: PolicyScope): string {
  if (scope === 'global') return 'global'
  if (scope === 'guild') return ctx.guildId ?? 'unknown-guild'
  return ctx.userId
}

function getPolicyKey(descriptor: PolicyDescriptor, target: PolicyTarget): string {
  if (descriptor.type === 'permission' || descriptor.type === 'role') return `${descriptor.type}:${target.kind}:${target.id}`
  if (descriptor.type === 'cooldown') return `${descriptor.type}:${target.kind}:${target.id}:${descriptor.scope}:${descriptor.windowMs}`
  return `${descriptor.type}:${target.kind}:${target.id}:${descriptor.scope}:${descriptor.limit}:${descriptor.windowMs}`
}

function getRateLimitKey(ctx: MiddlewareContext, descriptor: Extract<PolicyDescriptor, { scope: PolicyScope }>, target: PolicyTarget): string {
  return `${getPolicyKey(descriptor, target)}:${getScopeValue(ctx, descriptor.scope)}`
}

function getRemainingSeconds(resetAt: Date): number {
  return Math.max(1, Math.ceil((resetAt.getTime() - Date.now()) / 1000))
}

export function requirePermission(value: string): PolicyDefinition {
  return {
    descriptor: { type: 'permission', value },
    enforce(ctx) {
      if (!ctx.member?.permissions.includes(value)) throw new VivereUserError(`Missing permission: ${value}`)
    },
  }
}

export function requireRole(value: string): PolicyDefinition {
  return {
    descriptor: { type: 'role', value },
    enforce(ctx) {
      if (!ctx.member?.roles.includes(value)) throw new VivereUserError(`Missing role: ${value}`)
    },
  }
}

export function cooldown(input: CooldownPolicyInput): PolicyDefinition {
  const descriptor = {
    type: 'cooldown',
    scope: input.scope,
    windowMs: getDurationMs(input.window),
  } satisfies PolicyDescriptor

  return {
    descriptor,
    async enforce(ctx, target) {
      const result = await ctx.stores.rateLimit.increment(getRateLimitKey(ctx, descriptor, target), descriptor.windowMs)
      if (result.count > 1) {
        throw new VivereUserError(`Cooldown active. Try again in ${getRemainingSeconds(result.resetAt)}s.`)
      }
    },
  }
}

export function rateLimit(input: RateLimitPolicyInput): PolicyDefinition {
  const descriptor = {
    type: 'rateLimit',
    scope: input.scope,
    limit: input.limit,
    windowMs: getDurationMs(input.window),
  } satisfies PolicyDescriptor

  return {
    descriptor,
    async enforce(ctx, target) {
      const result = await ctx.stores.rateLimit.increment(getRateLimitKey(ctx, descriptor, target), descriptor.windowMs)
      if (result.count > descriptor.limit) {
        throw new VivereUserError(`Rate limit exceeded. Try again in ${getRemainingSeconds(result.resetAt)}s.`)
      }
    },
  }
}
