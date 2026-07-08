import { PermissionsBitField } from 'discord.js'
import type { AutocompleteChoice, DeferInput, InteractionMember, ModalSpec, ReplyInput } from '../authoring/types.js'
import type { OptionKind } from '../authoring/opt.js'
import type {
  AutocompleteInteractionAdapter,
  ButtonInteractionAdapter,
  ChatInputInteractionAdapter,
  InteractionAdapter,
  MessageCommandInteractionAdapter,
  ModalInteractionAdapter,
  SelectInteractionAdapter,
  UserCommandInteractionAdapter,
} from '../runtime/interaction-adapter.js'
import type { InteractionResponseBody } from './render.js'
import {
  renderAutocompleteResponse,
  renderDeferredReplyResponse,
  renderDeferredUpdateResponse,
  renderModalResponse,
  renderReplyResponse,
  renderUpdateResponse,
} from './render.js'

interface HttpInteractionPayload {
  type: number
  guild_id?: string
  locale?: string
  user?: { id?: string }
  member?: { user?: { id?: string }; roles?: string[]; permissions?: string }
  data?: HttpInteractionData
}

interface HttpInteractionData {
  type?: number
  name?: string
  target_id?: string
  component_type?: number
  custom_id?: string
  values?: string[]
  options?: HttpInteractionOption[]
  resolved?: HttpResolvedData
  components?: HttpActionRowPayload[]
}

interface HttpInteractionOption {
  type: number
  name: string
  value?: unknown
  focused?: boolean
  options?: HttpInteractionOption[]
}

interface HttpResolvedData {
  users?: Record<string, unknown>
  roles?: Record<string, unknown>
  attachments?: Record<string, unknown>
  messages?: Record<string, unknown>
}

interface HttpActionRowPayload {
  components?: HttpModalFieldPayload[]
}

interface HttpModalFieldPayload {
  custom_id?: string
  value?: string
}

export interface HttpAdapterCapture {
  response?: InteractionResponseBody
}

function setResponse(capture: HttpAdapterCapture, response: InteractionResponseBody): void {
  if (capture.response) throw new Error('HTTP interaction response already exists')
  capture.response = response
}

function getHttpMember(payload: HttpInteractionPayload): InteractionMember | undefined {
  if (!payload.member) return undefined
  return {
    roles: payload.member.roles ?? [],
    permissions: payload.member.permissions ? new PermissionsBitField(BigInt(payload.member.permissions)).toArray() : [],
  }
}

function getIdentity(payload: HttpInteractionPayload) {
  const member = getHttpMember(payload)
  return {
    userId: payload.user?.id ?? payload.member?.user?.id ?? 'unknown',
    ...(payload.guild_id ? { guildId: payload.guild_id } : {}),
    ...(payload.locale ? { locale: payload.locale } : {}),
    ...(member ? { member } : {}),
  }
}

function getRouteAndOptions(data: HttpInteractionData): { route: string[]; options: HttpInteractionOption[] } {
  const route = data.name ? [data.name] : []
  const options = data.options ?? []
  const first = options[0]
  if (!first) return { route, options }

  if (first.type === 1) {
    return { route: [...route, first.name], options: first.options ?? [] }
  }

  if (first.type === 2) {
    const subcommand = first.options?.[0]
    if (subcommand?.type === 1) {
      return { route: [...route, first.name, subcommand.name], options: subcommand.options ?? [] }
    }
    return { route: [...route, first.name], options: [] }
  }

  return { route, options }
}

function getResolvedValue(kind: OptionKind, value: unknown, resolved: HttpResolvedData | undefined): unknown {
  if (typeof value !== 'string') return value

  switch (kind) {
    case 'user':
      return resolved?.users?.[value] ?? value
    case 'role':
      return resolved?.roles?.[value] ?? value
    case 'attachment':
      return resolved?.attachments?.[value] ?? value
    default:
      return value
  }
}

function getOptionValue(
  options: HttpInteractionOption[],
  resolved: HttpResolvedData | undefined,
  name: string,
  kind: OptionKind,
  required: boolean,
): unknown {
  const option = options.find((item) => item.name === name)
  if (!option || option.value === undefined) {
    if (required) throw new Error(`Missing required option: ${name}`)
    return undefined
  }
  return getResolvedValue(kind, option.value, resolved)
}

function getFocusedOption(options: HttpInteractionOption[]): HttpInteractionOption | undefined {
  return options.find((option) => option.focused) ?? options[0]
}

function getModalFields(data: HttpInteractionData): Record<string, string> {
  const entries = (data.components ?? [])
    .flatMap((row) => row.components ?? [])
    .flatMap((field) => (field.custom_id ? [[field.custom_id, field.value ?? ''] as const] : []))
  return Object.fromEntries(entries)
}

function createChatInputAdapter(
  payload: HttpInteractionPayload,
  data: HttpInteractionData,
  capture: HttpAdapterCapture,
): ChatInputInteractionAdapter {
  const { route, options } = getRouteAndOptions(data)
  return {
    kind: 'command',
    commandName: data.name ?? '',
    route,
    ...getIdentity(payload),
    getOption(name, kind, required) {
      return getOptionValue(options, data.resolved, name, kind, required)
    },
    async reply(input: ReplyInput) {
      setResponse(capture, renderReplyResponse(input))
    },
    async deferReply(input?: DeferInput) {
      setResponse(capture, renderDeferredReplyResponse(input))
    },
    async showModal(input: ModalSpec) {
      setResponse(capture, renderModalResponse(input))
    },
  }
}

function createAutocompleteAdapter(
  payload: HttpInteractionPayload,
  data: HttpInteractionData,
  capture: HttpAdapterCapture,
): AutocompleteInteractionAdapter {
  const { route, options } = getRouteAndOptions(data)
  const focused = getFocusedOption(options)
  return {
    kind: 'autocomplete',
    commandName: data.name ?? '',
    route,
    focusedName: focused?.name ?? '',
    focusedValue: String(focused?.value ?? ''),
    ...getIdentity(payload),
    async respond(choices: AutocompleteChoice[]) {
      setResponse(capture, renderAutocompleteResponse(choices))
    },
  }
}

function createUserCommandAdapter(
  payload: HttpInteractionPayload,
  data: HttpInteractionData,
  capture: HttpAdapterCapture,
): UserCommandInteractionAdapter {
  return {
    kind: 'userCommand',
    commandName: data.name ?? '',
    targetUser: data.target_id ? data.resolved?.users?.[data.target_id] ?? data.target_id : undefined,
    ...getIdentity(payload),
    async reply(input) {
      setResponse(capture, renderReplyResponse(input))
    },
    async deferReply(input) {
      setResponse(capture, renderDeferredReplyResponse(input))
    },
  }
}

function createMessageCommandAdapter(
  payload: HttpInteractionPayload,
  data: HttpInteractionData,
  capture: HttpAdapterCapture,
): MessageCommandInteractionAdapter {
  return {
    kind: 'messageCommand',
    commandName: data.name ?? '',
    targetMessage: data.target_id ? data.resolved?.messages?.[data.target_id] ?? data.target_id : undefined,
    ...getIdentity(payload),
    async reply(input) {
      setResponse(capture, renderReplyResponse(input))
    },
    async deferReply(input) {
      setResponse(capture, renderDeferredReplyResponse(input))
    },
  }
}

function createButtonAdapter(
  payload: HttpInteractionPayload,
  data: HttpInteractionData,
  capture: HttpAdapterCapture,
): ButtonInteractionAdapter {
  return {
    kind: 'button',
    customId: data.custom_id ?? '',
    ...getIdentity(payload),
    async update(input) {
      setResponse(capture, renderUpdateResponse(input))
    },
    async reply(input) {
      setResponse(capture, renderReplyResponse(input))
    },
    async deferUpdate() {
      setResponse(capture, renderDeferredUpdateResponse())
    },
    async showModal(input) {
      setResponse(capture, renderModalResponse(input))
    },
  }
}

function createSelectAdapter(
  payload: HttpInteractionPayload,
  data: HttpInteractionData,
  capture: HttpAdapterCapture,
): SelectInteractionAdapter {
  return {
    kind: 'select',
    customId: data.custom_id ?? '',
    values: data.values ?? [],
    ...getIdentity(payload),
    async update(input) {
      setResponse(capture, renderUpdateResponse(input))
    },
    async reply(input) {
      setResponse(capture, renderReplyResponse(input))
    },
    async deferUpdate() {
      setResponse(capture, renderDeferredUpdateResponse())
    },
    async showModal(input) {
      setResponse(capture, renderModalResponse(input))
    },
  }
}

function createModalAdapter(
  payload: HttpInteractionPayload,
  data: HttpInteractionData,
  capture: HttpAdapterCapture,
): ModalInteractionAdapter {
  return {
    kind: 'modal',
    customId: data.custom_id ?? '',
    fields: getModalFields(data),
    ...getIdentity(payload),
    async reply(input) {
      setResponse(capture, renderReplyResponse(input))
    },
    async defer(input) {
      setResponse(capture, renderDeferredReplyResponse(input))
    },
  }
}

export function createHttpInteractionAdapter(
  payload: HttpInteractionPayload,
  capture: HttpAdapterCapture,
): InteractionAdapter | undefined {
  const data = payload.data
  if (!data) return undefined

  if (payload.type === 2) {
    if (data.type === 2) return createUserCommandAdapter(payload, data, capture)
    if (data.type === 3) return createMessageCommandAdapter(payload, data, capture)
    return createChatInputAdapter(payload, data, capture)
  }

  if (payload.type === 3) {
    if (data.component_type === 3) return createSelectAdapter(payload, data, capture)
    return createButtonAdapter(payload, data, capture)
  }

  if (payload.type === 4) return createAutocompleteAdapter(payload, data, capture)
  if (payload.type === 5) return createModalAdapter(payload, data, capture)
  return undefined
}
