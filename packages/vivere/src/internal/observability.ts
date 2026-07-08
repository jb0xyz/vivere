export type InteractionOutcome = 'ok' | 'blocked' | 'error'

export type VivereEvent =
  | { type: 'command.started'; route: string }
  | { type: 'command.failed'; route: string; durationMs: number }
  | { type: 'command.finished'; route: string; durationMs: number; outcome: InteractionOutcome }
  | { type: 'component.started'; kind: string; id: string }
  | { type: 'component.failed'; kind: string; id: string; durationMs: number }
  | { type: 'component.finished'; kind: string; id: string; durationMs: number; outcome: InteractionOutcome }
  | { type: 'event.started'; name: string }
  | { type: 'event.failed'; name: string; durationMs: number }
  | { type: 'event.handled'; name: string; durationMs: number }
  | { type: 'sync.completed'; guildId?: string; count: number }

export type VivereEventSink = (event: VivereEvent) => void

export const ignoreVivereEvent: VivereEventSink = () => {}

export function getDurationMs(startedAt: number): number {
  return Date.now() - startedAt
}
