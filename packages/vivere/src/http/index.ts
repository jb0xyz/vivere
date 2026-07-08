import { randomBytes } from 'node:crypto'
import type {
  ApplicationCommandDefinition,
  ComponentDefinition,
  PluginDefinition,
} from '../authoring/create-vivere.js'
import type { AnyMiddlewareDefinition } from '../authoring/middleware.js'
import type { ErrorReporter } from '../internal/errors.js'
import { reportError as defaultReportError } from '../internal/errors.js'
import type { VivereEventSink } from '../internal/observability.js'
import { createRouter } from '../runtime/router.js'
import { createStorePorts } from '../stores/memory.js'
import type { StoreInput } from '../stores/types.js'
import { createHttpInteractionAdapter } from './adapters.js'
import type { HttpAdapterCapture } from './adapters.js'
import { renderPongResponse } from './render.js'
import type { InteractionResponseBody } from './render.js'
import { verifyDiscordSignature } from './signature.js'

export type HttpHeaders = Record<string, string | string[] | undefined>

export interface HttpResponse {
  status: number
  body: string
}

export type HttpHandler = (rawBody: string, headers: HttpHeaders) => Promise<HttpResponse>

export interface HttpHandlerInput<TServices> {
  publicKey: string
  customIdSecret?: string
  commands?: ApplicationCommandDefinition<TServices>[]
  components?: ComponentDefinition<TServices>[]
  plugins?: PluginDefinition<TServices>[]
  middleware?: AnyMiddlewareDefinition<TServices>[]
  services?: TServices
  createServices?: () => TServices | Promise<TServices>
  stores?: StoreInput
  reportError?: ErrorReporter
  onEvent?: VivereEventSink
}

function getHeader(headers: HttpHeaders, name: string): string | undefined {
  const lowerName = name.toLowerCase()
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() !== lowerName) continue
    if (Array.isArray(value)) return value[0]
    return value
  }
  return undefined
}

function createResponse(status: number, body?: InteractionResponseBody): HttpResponse {
  return {
    status,
    body: body ? JSON.stringify(body) : '',
  }
}

function createServicesFactory<TServices>(input: HttpHandlerInput<TServices>): () => Promise<TServices> {
  return async () => {
    if (input.createServices) return input.createServices()
    return input.services as TServices
  }
}

function getCommandList<TServices>(input: HttpHandlerInput<TServices>): ApplicationCommandDefinition<TServices>[] {
  return [
    ...(input.commands ?? []),
    ...(input.plugins ?? []).flatMap((plugin) => plugin.commands),
  ]
}

function getComponentList<TServices>(input: HttpHandlerInput<TServices>): ComponentDefinition<TServices>[] {
  return [
    ...(input.components ?? []),
    ...(input.plugins ?? []).flatMap((plugin) => plugin.components),
  ]
}

export function createHttpHandler<TServices = unknown>(input: HttpHandlerInput<TServices>): HttpHandler {
  const createServices = createServicesFactory(input)
  const stores = createStorePorts(input.stores)
  const reportError = input.reportError ?? defaultReportError
  const components = getComponentList(input)
  if (components.length > 0 && input.customIdSecret === undefined) {
    throw new Error(
      'createHttpHandler: customIdSecret is required when components are registered. ' +
        'Provide a stable secret shared across instances; the public key is not secret and must not be used to derive it.',
    )
  }
  const router = createRouter({
    commands: getCommandList(input),
    components,
    middleware: input.middleware,
    secret: input.customIdSecret ?? randomBytes(32).toString('base64url'),
    stores,
    reportError,
    onEvent: input.onEvent,
  })

  return async (rawBody, headers) => {
    const isVerified = verifyDiscordSignature({
      publicKey: input.publicKey,
      rawBody,
      signature: getHeader(headers, 'x-signature-ed25519'),
      timestamp: getHeader(headers, 'x-signature-timestamp'),
    })
    if (!isVerified) return createResponse(401)

    const payload = JSON.parse(rawBody) as { type?: number }
    if (payload.type === 1) return createResponse(200, renderPongResponse())

    const capture: HttpAdapterCapture = {}
    const adapter = createHttpInteractionAdapter(payload as never, capture)
    if (!adapter) return createResponse(400)

    const services = await createServices()
    await router.dispatch(adapter, { services, stores })
    return capture.response ? createResponse(200, capture.response) : createResponse(204)
  }
}
