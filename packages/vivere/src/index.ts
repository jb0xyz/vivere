export const VERSION = '0.0.0'
export { createVivere } from './authoring/create-vivere.js'
export type {
  ButtonIR,
  ButtonInput,
  CommandIR,
  CommandInput,
  EventIR,
  EventInput,
} from './authoring/create-vivere.js'
export { opt } from './authoring/opt.js'
export type {
  OptionNode,
  OptionKind,
  Presence,
  AnyOption,
  OptionsRecord,
  InferOptions,
} from './authoring/opt.js'
export { param } from './authoring/param.js'
export type { InferParams, ParamKind, ParamNode, ParamsRecord } from './authoring/param.js'
export { defineConfig } from './config/define-config.js'
export type { VivereConfig } from './config/define-config.js'
export type {
  ButtonActionRow,
  ButtonContext,
  ButtonStyleName,
  CommandContext,
  ComponentsBuilder,
  EventContext,
  ReplyInput,
  DeferInput,
} from './authoring/types.js'
export { serializeCommand, toDiscordName } from './manifest/serialize.js'
export type { SerializedCommand, SerializedOption } from './manifest/serialize.js'
export {
  buildManifest,
  manifestToJson,
} from './manifest/manifest.js'
export type {
  Manifest,
  SerializedButton,
  SerializedButtonParam,
  SerializedEvent,
} from './manifest/manifest.js'
export {
  discoverButtons,
  discoverCommands,
  discoverEvents,
} from './discovery/discover.js'
export { createRouter } from './runtime/router.js'
export type { InteractionRouter } from './runtime/router.js'
export type {
  ButtonInteractionAdapter,
  ChatInputInteractionAdapter,
} from './runtime/interaction-adapter.js'
export { createApp } from './runtime/create-app.js'
export type { App, AppConfig, CreateAppOptions } from './runtime/create-app.js'
export { GatewayIntentBits } from 'discord.js'
