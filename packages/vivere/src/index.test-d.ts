import { expectTypeOf } from 'expect-type'
import {
  GatewayIntentBits,
  createApp,
  createVivere,
  defineConfig,
  opt,
  param,
} from './index.js'
import type {
  ActionRowSpec,
  App,
  AppConfig,
  ButtonContext,
  ButtonDefinition,
  ButtonDescriptor,
  ButtonInput,
  ButtonSpec,
  ButtonStyleName,
  CommandContext,
  CommandDefinition,
  CommandDescriptor,
  CommandInput,
  ComponentsBuilder,
  CreateAppOptions,
  DeferInput,
  EventContext,
  EventDefinition,
  EventDescriptor,
  EventInput,
  InferOptions,
  InferParams,
  OptionKind,
  OptionNode,
  ParamKind,
  ParamNode,
  ReplyInput,
  VivereConfig,
} from './index.js'

expectTypeOf(createVivere).toBeFunction()
expectTypeOf(createApp).toBeFunction()
expectTypeOf(defineConfig).toBeFunction()
expectTypeOf(opt.string).toBeFunction()
expectTypeOf(param.snowflake).toBeFunction()
expectTypeOf(GatewayIntentBits.Guilds).toBeNumber()

export type PublicTypes = [
  ActionRowSpec,
  App,
  AppConfig,
  ButtonContext<Record<string, never>, unknown>,
  ButtonDefinition,
  ButtonDescriptor,
  ButtonInput<Record<string, never>, unknown>,
  ButtonSpec,
  ButtonStyleName,
  CommandContext<Record<string, never>, unknown>,
  CommandDefinition,
  CommandDescriptor,
  CommandInput<Record<string, never>, unknown>,
  ComponentsBuilder,
  CreateAppOptions<unknown>,
  DeferInput,
  EventContext<unknown>,
  EventDefinition,
  EventDescriptor,
  EventInput<'ready', unknown>,
  InferOptions<Record<string, never>>,
  InferParams<Record<string, never>>,
  OptionKind,
  OptionNode<unknown, 'required'>,
  ParamKind,
  ParamNode<unknown>,
  ReplyInput,
  VivereConfig,
]

// @ts-expect-error internal
export type RemovedCreateRouter = typeof import('./index.js').createRouter
// @ts-expect-error internal
export type RemovedInteractionAdapter = import('./index.js').InteractionAdapter
// @ts-expect-error internal
export type RemovedDiscoverCommands = typeof import('./index.js').discoverCommands
// @ts-expect-error internal
export type RemovedBuildManifest = typeof import('./index.js').buildManifest
// @ts-expect-error internal
export type RemovedToDiscordName = typeof import('./index.js').toDiscordName
// @ts-expect-error internal
export type RemovedVersion = typeof import('./index.js').VERSION
