import type { AnyMiddlewareDefinition, MiddlewareContext } from '../authoring/middleware.js'
import { VivereUserError } from '../authoring/middleware.js'
import type { ReplyInput } from '../authoring/types.js'
import type { ErrorContext, ErrorReporter } from '../internal/errors.js'
import type { InteractionOutcome } from '../internal/observability.js'

export interface RunMiddlewareInput<TContext extends MiddlewareContext> {
  ctx: TContext
  middleware: readonly AnyMiddlewareDefinition[]
  execute(ctx: TContext & Record<string, unknown>): Promise<unknown>
  reportError: ErrorReporter
  errorContext: ErrorContext
  replyUserError?: (input: ReplyInput) => Promise<void>
}

export interface RunMiddlewareResult {
  outcome: InteractionOutcome
}

async function handleMiddlewareError<TContext extends MiddlewareContext>(
  error: unknown,
  ctx: TContext,
  input: RunMiddlewareInput<TContext>,
): Promise<void> {
  let currentError = error
  for (const middleware of input.middleware) {
    if (!middleware.onError) continue
    try {
      const nextError = await middleware.onError(currentError, ctx as MiddlewareContext<unknown> & Record<string, unknown>)
      if (nextError !== undefined) currentError = nextError
    } catch (caught) {
      currentError = caught
    }
  }

  if (currentError instanceof VivereUserError && input.replyUserError) {
    await input.replyUserError({ content: currentError.message, ephemeral: true })
    return
  }

  input.reportError(currentError, input.errorContext)
}

export async function runWithMiddleware<TContext extends MiddlewareContext>(
  input: RunMiddlewareInput<TContext>,
): Promise<RunMiddlewareResult> {
  let ctx = input.ctx as TContext & Record<string, unknown>

  try {
    for (const middleware of input.middleware) {
      if (!middleware.before) continue
      let canContinue = false
      await middleware.before(ctx, async <TExtension extends Record<string, unknown> = Record<string, never>>(
        extension?: TExtension,
      ) => {
        const nextExtension = extension ?? ({} as TExtension)
        canContinue = true
        ctx = { ...ctx, ...nextExtension }
        return nextExtension
      })
      if (!canContinue) return { outcome: 'blocked' }
    }

    const result = await input.execute(ctx)

    for (const middleware of input.middleware) {
      if (middleware.after) await middleware.after(ctx, result)
    }
    return { outcome: 'ok' }
  } catch (error) {
    await handleMiddlewareError(error, ctx, input)
    return { outcome: 'error' }
  }
}
