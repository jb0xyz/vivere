export const VERSION = '0.0.0'
export { createVivere } from './authoring/create-vivere.js'
export type { CommandIR, CommandInput, EventIR } from './authoring/create-vivere.js'
export { opt } from './authoring/opt.js'
export type {
  OptionNode,
  OptionKind,
  Presence,
  AnyOption,
  OptionsRecord,
  InferOptions,
} from './authoring/opt.js'
export type { CommandContext, EventContext, ReplyInput, DeferInput } from './authoring/types.js'
export { serializeCommand, toDiscordName } from './manifest/serialize.js'
export type { SerializedCommand, SerializedOption } from './manifest/serialize.js'
export { createRouter } from './runtime/router.js'
export type { InteractionRouter } from './runtime/router.js'
export type { ChatInputInteractionAdapter } from './runtime/interaction-adapter.js'
export { createApp } from './runtime/create-app.js'
export type { App, AppConfig, CreateAppOptions } from './runtime/create-app.js'
export { GatewayIntentBits } from 'discord.js'
