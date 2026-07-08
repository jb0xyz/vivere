import type {
  ApplicationCommandDefinition,
  CommandDefinition,
  ComponentDefinition,
  EventDefinition,
  PluginDefinition,
} from '../authoring/create-vivere.js'
import type { AnyMiddlewareDefinition } from '../authoring/middleware.js'
import type { AutocompleteChoice, DeferInput, ModalSpec, ReplyInput } from '../authoring/types.js'
import type { ComponentKind } from '../components/custom-id.js'
import { encodeCustomId } from '../components/custom-id.js'
import type { ErrorReporter } from '../internal/errors.js'
import type {
  AutocompleteInteractionAdapter,
  ButtonInteractionAdapter,
  ChatInputInteractionAdapter,
  MessageCommandInteractionAdapter,
  ModalInteractionAdapter,
  SelectInteractionAdapter,
  UserCommandInteractionAdapter,
} from '../runtime/interaction-adapter.js'
import { reportError as defaultReportError } from '../internal/errors.js'
import { runWithMiddleware } from '../runtime/middleware.js'
import { createRouter } from '../runtime/router.js'
import { createStorePorts } from '../stores/memory.js'
import type { StoreInput } from '../stores/types.js'

export type TestReply = Exclude<ReplyInput, string>

export interface TestRunResult {
  replies: TestReply[]
  updates: TestReply[]
  defers: DeferInput[]
  modal?: ModalSpec
}

export interface CreateTestBotInput<TServices> {
  commands?: ApplicationCommandDefinition<TServices>[]
  events?: EventDefinition<TServices>[]
  components?: ComponentDefinition<TServices>[]
  plugins?: PluginDefinition<TServices>[]
  middleware?: AnyMiddlewareDefinition<TServices>[]
  services?: TServices
  createServices?: () => TServices | Promise<TServices>
  stores?: StoreInput
  reportError?: ErrorReporter
}

export interface TestIdentityInput {
  userId?: string
  guildId?: string
}

export interface TestCommandRunInput extends TestIdentityInput {
  options?: Record<string, unknown>
}

export interface TestButtonInput {
  params?: Record<string, unknown>
}

export interface TestSelectInput {
  params?: Record<string, unknown>
  values?: string[]
}

export interface TestModalInput {
  params?: Record<string, unknown>
  fields?: Record<string, string>
}

export interface TestUserCommandRunInput extends TestIdentityInput {
  targetUser: unknown
}

export interface TestMessageCommandRunInput extends TestIdentityInput {
  targetMessage: unknown
}

export interface TestAutocompleteInput extends TestIdentityInput {
  option: string
  value: string
}

export interface TestBot {
  command(route: string): { run(input?: TestCommandRunInput): Promise<TestRunResult> }
  button(id: string, input?: TestButtonInput): { run(input?: TestIdentityInput): Promise<TestRunResult> }
  select(id: string, input?: TestSelectInput): { run(input?: TestIdentityInput): Promise<TestRunResult> }
  modal(id: string, input?: TestModalInput): { run(input?: TestIdentityInput): Promise<TestRunResult> }
  userCommand(name: string): { run(input: TestUserCommandRunInput): Promise<TestRunResult> }
  messageCommand(name: string): { run(input: TestMessageCommandRunInput): Promise<TestRunResult> }
  autocomplete(route: string, input: TestAutocompleteInput): Promise<AutocompleteChoice[]>
  event(name: string): { emit(...args: unknown[]): Promise<void> }
}

const TEST_SECRET = 'vivere-test-secret'

function normalizeReply(input: ReplyInput): TestReply {
  if (typeof input === 'string') return { content: input }
  return input
}

function createCapture(): TestRunResult {
  return {
    replies: [],
    updates: [],
    defers: [],
  }
}

function getTestIdentity(input: TestIdentityInput = {}) {
  return {
    userId: input.userId ?? 'test-user',
    ...(input.guildId ? { guildId: input.guildId } : {}),
  }
}

function parseRoute(route: string): string[] {
  return route.split(/[ /]+/).filter(Boolean)
}

function getRouteKey(route: string): string {
  return parseRoute(route).join('/')
}

function findSlashCommand<TServices>(
  commandList: ApplicationCommandDefinition<TServices>[],
  route: string,
): CommandDefinition<TServices> | undefined {
  const routeKey = getRouteKey(route)
  return commandList.find(
    (command): command is CommandDefinition<TServices> =>
      command.descriptor.kind === 'command' && command.descriptor.route.join('/') === routeKey,
  )
}

function createServicesFactory<TServices>(
  input: CreateTestBotInput<TServices>,
): () => Promise<TServices> {
  return async () => {
    if (input.createServices) return input.createServices()
    return input.services as TServices
  }
}

function getOptionValues<TServices>(
  command: CommandDefinition<TServices> | undefined,
  options: Record<string, unknown>,
): Record<string, unknown> {
  if (!command) return options
  return Object.fromEntries(
    command.descriptor.options.map((option) => [
      option.name,
      options[option.property] ?? options[option.name],
    ]),
  )
}

function findOptionName<TServices>(command: CommandDefinition<TServices> | undefined, option: string): string {
  const descriptor = command?.descriptor.options.find((item) => item.property === option || item.name === option)
  return descriptor?.name ?? option
}

function createCommandAdapter<TServices>(
  route: string,
  command: CommandDefinition<TServices> | undefined,
  options: Record<string, unknown>,
  identity: TestIdentityInput,
  capture: TestRunResult,
): ChatInputInteractionAdapter {
  const routeList = parseRoute(route)
  const optionValues = getOptionValues(command, options)
  return {
    kind: 'command',
    commandName: routeList[0] ?? route,
    route: routeList,
    ...getTestIdentity(identity),
    getOption(name, _kind, required) {
      const value = optionValues[name]
      if (value === undefined && required) throw new Error(`Missing required option: ${name}`)
      return value
    },
    async reply(input) {
      capture.replies.push(normalizeReply(input))
    },
    async deferReply(input) {
      capture.defers.push(input ?? {})
    },
    async showModal(input) {
      capture.modal = input
    },
  }
}

function createAutocompleteAdapter(
  route: string,
  focusedName: string,
  focusedValue: string,
  identity: TestIdentityInput,
  choices: AutocompleteChoice[],
): AutocompleteInteractionAdapter {
  const routeList = parseRoute(route)
  return {
    kind: 'autocomplete',
    commandName: routeList[0] ?? route,
    route: routeList,
    focusedName,
    focusedValue,
    ...getTestIdentity(identity),
    async respond(input) {
      choices.splice(0, choices.length, ...input)
    },
  }
}

function getComponentList<TServices>(input: CreateTestBotInput<TServices>): ComponentDefinition<TServices>[] {
  return [
    ...(input.components ?? []),
    ...(input.plugins ?? []).flatMap((plugin) => plugin.components),
  ]
}

function getCommandList<TServices>(input: CreateTestBotInput<TServices>): ApplicationCommandDefinition<TServices>[] {
  return [
    ...(input.commands ?? []),
    ...(input.plugins ?? []).flatMap((plugin) => plugin.commands),
  ]
}

function getEventList<TServices>(input: CreateTestBotInput<TServices>): EventDefinition<TServices>[] {
  return [
    ...(input.events ?? []),
    ...(input.plugins ?? []).flatMap((plugin) => plugin.events),
  ]
}

function findComponent<TServices>(
  componentList: ComponentDefinition<TServices>[],
  componentKind: ComponentKind,
  id: string,
): ComponentDefinition<TServices> | undefined {
  return componentList.find(
    (component) => component.descriptor.componentKind === componentKind && component.descriptor.id === id,
  )
}

function encodeComponentParams<TServices>(
  component: ComponentDefinition<TServices>,
  params: Record<string, unknown>,
): Record<string, string> {
  return Object.fromEntries(
    component.descriptor.params.map((param) => {
      const codec = component.codecs[param.name]
      if (!codec) throw new Error(`Missing component codec: ${param.name}`)
      return [param.name, codec.encode(params[param.name])]
    }),
  )
}

function createCustomId<TServices>(
  component: ComponentDefinition<TServices>,
  params: Record<string, unknown>,
): string {
  return encodeCustomId(
    component.descriptor.componentKind,
    component.descriptor.id,
    encodeComponentParams(component, params),
    TEST_SECRET,
  )
}

function createButtonAdapter(customId: string, identity: TestIdentityInput, capture: TestRunResult): ButtonInteractionAdapter {
  return {
    kind: 'button',
    customId,
    ...getTestIdentity(identity),
    async update(input) {
      capture.updates.push(normalizeReply(input))
    },
    async reply(input) {
      capture.replies.push(normalizeReply(input))
    },
    async deferUpdate() {
      capture.defers.push({})
    },
    async showModal(input) {
      capture.modal = input
    },
  }
}

function createSelectAdapter(
  customId: string,
  values: string[],
  identity: TestIdentityInput,
  capture: TestRunResult,
): SelectInteractionAdapter {
  return {
    kind: 'select',
    customId,
    values,
    ...getTestIdentity(identity),
    async update(input) {
      capture.updates.push(normalizeReply(input))
    },
    async reply(input) {
      capture.replies.push(normalizeReply(input))
    },
    async deferUpdate() {
      capture.defers.push({})
    },
    async showModal(input) {
      capture.modal = input
    },
  }
}

function createModalAdapter(
  customId: string,
  fields: Record<string, string>,
  identity: TestIdentityInput,
  capture: TestRunResult,
): ModalInteractionAdapter {
  return {
    kind: 'modal',
    customId,
    fields,
    ...getTestIdentity(identity),
    async reply(input) {
      capture.replies.push(normalizeReply(input))
    },
    async defer(input) {
      capture.defers.push(input ?? {})
    },
  }
}

function createUserCommandAdapter(
  name: string,
  targetUser: unknown,
  identity: TestIdentityInput,
  capture: TestRunResult,
): UserCommandInteractionAdapter {
  return {
    kind: 'userCommand',
    commandName: name,
    targetUser,
    ...getTestIdentity(identity),
    async reply(input) {
      capture.replies.push(normalizeReply(input))
    },
    async deferReply(input) {
      capture.defers.push(input ?? {})
    },
  }
}

function createMessageCommandAdapter(
  name: string,
  targetMessage: unknown,
  identity: TestIdentityInput,
  capture: TestRunResult,
): MessageCommandInteractionAdapter {
  return {
    kind: 'messageCommand',
    commandName: name,
    targetMessage,
    ...getTestIdentity(identity),
    async reply(input) {
      capture.replies.push(normalizeReply(input))
    },
    async deferReply(input) {
      capture.defers.push(input ?? {})
    },
  }
}

export function createTestBot<TServices = unknown>(input: CreateTestBotInput<TServices>): TestBot {
  const commandList = getCommandList(input)
  const componentList = getComponentList(input)
  const eventList = getEventList(input)
  const createServices = createServicesFactory(input)
  const reportError = input.reportError ?? defaultReportError
  const stores = createStorePorts(input.stores)
  const router = createRouter({
    commands: commandList,
    components: componentList,
    middleware: input.middleware,
    secret: TEST_SECRET,
    stores,
    reportError,
  })

  async function dispatch(adapter: Parameters<typeof router.dispatch>[0], capture: TestRunResult): Promise<TestRunResult> {
    const services = await createServices()
    await router.dispatch(adapter, { services, stores })
    return capture
  }

  return {
    command(route) {
      return {
        async run(runInput = {}) {
          const capture = createCapture()
          const command = findSlashCommand(commandList, route)
          return dispatch(createCommandAdapter(route, command, runInput.options ?? {}, runInput, capture), capture)
        },
      }
    },
    button(id, buttonInput = {}) {
      return {
        async run(runInput = {}) {
          const component = findComponent(componentList, 'button', id)
          if (!component) throw new Error(`Unknown test button: ${id}`)
          const capture = createCapture()
          return dispatch(
            createButtonAdapter(createCustomId(component, buttonInput.params ?? {}), runInput, capture),
            capture,
          )
        },
      }
    },
    select(id, selectInput = {}) {
      return {
        async run(runInput = {}) {
          const component = findComponent(componentList, 'select', id)
          if (!component) throw new Error(`Unknown test select: ${id}`)
          const capture = createCapture()
          const customId = createCustomId(component, selectInput.params ?? {})
          return dispatch(createSelectAdapter(customId, selectInput.values ?? [], runInput, capture), capture)
        },
      }
    },
    modal(id, modalInput = {}) {
      return {
        async run(runInput = {}) {
          const component = findComponent(componentList, 'modal', id)
          if (!component) throw new Error(`Unknown test modal: ${id}`)
          const capture = createCapture()
          const customId = createCustomId(component, modalInput.params ?? {})
          return dispatch(createModalAdapter(customId, modalInput.fields ?? {}, runInput, capture), capture)
        },
      }
    },
    userCommand(name) {
      return {
        async run(runInput) {
          const capture = createCapture()
          return dispatch(createUserCommandAdapter(name, runInput.targetUser, runInput, capture), capture)
        },
      }
    },
    messageCommand(name) {
      return {
        async run(runInput) {
          const capture = createCapture()
          return dispatch(createMessageCommandAdapter(name, runInput.targetMessage, runInput, capture), capture)
        },
      }
    },
    async autocomplete(route, autocompleteInput) {
      const command = findSlashCommand(commandList, route)
      const choices: AutocompleteChoice[] = []
      const adapter = createAutocompleteAdapter(
        route,
        findOptionName(command, autocompleteInput.option),
        autocompleteInput.value,
        autocompleteInput,
        choices,
      )
      const services = await createServices()
      await router.dispatch(adapter, { services, stores })
      return choices
    },
    event(name) {
      return {
        async emit(...args) {
          const services = await createServices()
          await Promise.all(
            eventList
              .filter((event) => String(event.descriptor.name) === name)
              .map((event) =>
                runWithMiddleware({
                  ctx: { services, stores, client: {}, userId: 'system' },
                  middleware: [...(input.middleware ?? []), ...event.middleware],
                  execute: (nextCtx) => event.execute(nextCtx, ...args),
                  reportError,
                  errorContext: { phase: 'event', id: String(event.descriptor.name) },
                }),
              ),
          )
        },
      }
    },
  }
}
