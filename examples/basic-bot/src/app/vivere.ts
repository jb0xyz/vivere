import { createVivere } from 'vivere'

export type Services = { logger: { info: (m: string) => void } }

export const { defineCommand, defineEvent, opt } = createVivere<Services>()
