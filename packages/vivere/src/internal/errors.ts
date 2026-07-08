export type ErrorPhase = 'command' | 'component' | 'event'

export interface ErrorContext {
  phase: ErrorPhase
  kind?: string
  id?: string
}

export type ErrorReporter = (error: unknown, context: ErrorContext) => void

export function reportError(error: unknown, context: ErrorContext): void {
  void context
  console.error(error)
}
