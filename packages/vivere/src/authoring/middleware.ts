import type { StorePorts } from '../stores/types.js'

export interface MiddlewareDescriptor {
  name: string
}

export interface MiddlewareContext<TServices = unknown> {
  services: TServices
  stores: StorePorts
  userId: string
  guildId?: string
}

export type MiddlewareNext = <TExtension extends Record<string, unknown> = Record<string, never>>(
  extension?: TExtension,
) => Promise<TExtension>

export type MiddlewareBefore<TServices> = (
  ctx: MiddlewareContext<TServices>,
  next: MiddlewareNext,
) => unknown

type MaybePromise<T> = T | Promise<T>

export interface MiddlewareDefinition<
  TServices = unknown,
  TExtension extends Record<string, unknown> = Record<string, never>,
> {
  readonly descriptor: MiddlewareDescriptor
  readonly before?: MiddlewareBefore<unknown>
  readonly after?: (ctx: MiddlewareContext<unknown> & Record<string, unknown>, result: unknown) => MaybePromise<void>
  readonly onError?: (
    error: unknown,
    ctx: MiddlewareContext<unknown> & Record<string, unknown>,
  ) => MaybePromise<unknown>
  readonly __services?: TServices
  readonly __extension?: TExtension
}

export interface MiddlewareInput<
  TServices,
  TExtension extends Record<string, unknown>,
> {
  name: string
  before?: (ctx: MiddlewareContext<TServices>, next: MiddlewareNext) => MaybePromise<TExtension | void>
  after?: (ctx: MiddlewareContext<TServices> & TExtension, result: unknown) => MaybePromise<void>
  onError?: (error: unknown, ctx: MiddlewareContext<TServices> & Partial<TExtension>) => MaybePromise<unknown>
}

export type AnyMiddlewareDefinition<TServices = unknown> = MiddlewareDefinition<TServices, Record<string, unknown>>

type MiddlewareExtensionOf<TMiddleware> =
  TMiddleware extends MiddlewareDefinition<unknown, infer TExtension> ? TExtension : Record<string, never>

type UnionToIntersection<TUnion> = (TUnion extends unknown ? (value: TUnion) => void : never) extends (
  value: infer TIntersection,
) => void
  ? TIntersection
  : never

export type InferMiddlewareExtensions<TMiddlewareList extends readonly unknown[] | undefined> =
  TMiddlewareList extends readonly unknown[]
    ? UnionToIntersection<MiddlewareExtensionOf<TMiddlewareList[number]>>
    : Record<string, never>

export class VivereUserError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'VivereUserError'
  }
}

export function defineMiddleware<
  TServices,
  TExtension extends Record<string, unknown> = Record<string, never>,
>(input: MiddlewareInput<TServices, TExtension>): MiddlewareDefinition<TServices, TExtension> {
  return {
    descriptor: { name: input.name },
    ...(input.before ? { before: input.before as MiddlewareDefinition<TServices, TExtension>['before'] } : {}),
    ...(input.after ? { after: input.after as MiddlewareDefinition<TServices, TExtension>['after'] } : {}),
    ...(input.onError ? { onError: input.onError as MiddlewareDefinition<TServices, TExtension>['onError'] } : {}),
  }
}
