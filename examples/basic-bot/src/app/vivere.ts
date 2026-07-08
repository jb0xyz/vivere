import { createVivere } from '@jb0xyz/vivere'

export type Services = { logger: { info: (m: string) => void } }

export const {
  defineButton,
  defineCommand,
  defineEvent,
  defineMiddleware,
  defineModal,
  definePlugin,
  defineSelect,
  defineUserCommand,
  field,
  opt,
  param,
} = createVivere<Services>()
