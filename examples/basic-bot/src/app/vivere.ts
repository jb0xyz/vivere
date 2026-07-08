import { createVivere } from '@jb0xyz/vivere'

export type Services = { logger: { info: (m: string) => void } }

export const { defineButton, defineCommand, defineEvent, defineModal, defineSelect, field, opt, param } =
  createVivere<Services>()
