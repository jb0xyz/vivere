import type {
  AutocompleteInteraction,
  ButtonInteraction,
  ChatInputCommandInteraction,
  Interaction,
  MessageContextMenuCommandInteraction,
  ModalData,
  ModalSubmitInteraction,
  StringSelectMenuInteraction,
  UserContextMenuCommandInteraction,
} from 'discord.js'
import { ComponentType, PermissionsBitField } from 'discord.js'
import type { InteractionMember, ReplyInput } from '../authoring/types.js'
import type {
  AutocompleteInteractionAdapter,
  ButtonInteractionAdapter,
  ChatInputInteractionAdapter,
  MessageCommandInteractionAdapter,
  ModalInteractionAdapter,
  SelectInteractionAdapter,
  UserCommandInteractionAdapter,
} from '../runtime/interaction-adapter.js'
import type { InteractionRouter } from '../runtime/router.js'
import type { StorePorts } from '../stores/types.js'
import { DISCORD_OPTION_KIND } from './option-kinds.js'
import { renderInteractionDefer, renderInteractionReply, renderInteractionUpdate, renderModal } from './render.js'

function getRoleList(member: unknown): string[] {
  const roles = (member as { roles?: unknown } | undefined)?.roles
  if (Array.isArray(roles)) return roles.filter((role): role is string => typeof role === 'string')

  const cache = (roles as { cache?: { keys(): Iterable<string> } } | undefined)?.cache
  if (cache) return Array.from(cache.keys())
  return []
}

function getPermissionList(member: unknown): string[] {
  const permissions = (member as { permissions?: unknown } | undefined)?.permissions
  const toArray = (permissions as { toArray?: () => string[] } | undefined)?.toArray
  if (toArray) return toArray.call(permissions)
  if (typeof permissions === 'string' || typeof permissions === 'number' || typeof permissions === 'bigint') {
    return new PermissionsBitField(BigInt(permissions)).toArray()
  }
  return []
}

function getInteractionMember(member: unknown): InteractionMember | undefined {
  if (!member) return undefined
  return {
    roles: getRoleList(member),
    permissions: getPermissionList(member),
  }
}

function getInteractionIdentity(interaction: {
  user?: { id?: string }
  guildId?: string | null
  locale?: string | null
  member?: unknown
}) {
  const member = getInteractionMember(interaction.member)
  return {
    userId: interaction.user?.id ?? 'unknown',
    guildId: interaction.guildId ?? undefined,
    ...(interaction.locale ? { locale: interaction.locale } : {}),
    ...(member ? { member } : {}),
  }
}

export function toChatInputAdapter(
  interaction: ChatInputCommandInteraction,
): ChatInputInteractionAdapter {
  const group = interaction.options?.getSubcommandGroup(false)
  const subcommand = interaction.options?.getSubcommand(false)
  const route = [interaction.commandName, group, subcommand].filter((item): item is string => Boolean(item))

  return {
    kind: 'command',
    commandName: interaction.commandName,
    route,
    ...getInteractionIdentity(interaction),
    getOption(name, kind, required) {
      return DISCORD_OPTION_KIND[kind].get(interaction.options, name, required)
    },
    async reply(input: ReplyInput) {
      await interaction.reply(renderInteractionReply(input))
    },
    async deferReply(input) {
      await interaction.deferReply(renderInteractionDefer(input))
    },
    async showModal(input) {
      await interaction.showModal(renderModal(input))
    },
  }
}

export function toAutocompleteAdapter(interaction: AutocompleteInteraction): AutocompleteInteractionAdapter {
  const group = interaction.options?.getSubcommandGroup(false)
  const subcommand = interaction.options?.getSubcommand(false)
  const route = [interaction.commandName, group, subcommand].filter((item): item is string => Boolean(item))
  const focused = interaction.options.getFocused(true)

  return {
    kind: 'autocomplete',
    commandName: interaction.commandName,
    route,
    focusedName: focused.name,
    focusedValue: String(focused.value),
    ...getInteractionIdentity(interaction),
    async respond(choices) {
      await interaction.respond(choices)
    },
  }
}

export function toUserCommandAdapter(interaction: UserContextMenuCommandInteraction): UserCommandInteractionAdapter {
  return {
    kind: 'userCommand',
    commandName: interaction.commandName,
    targetUser: interaction.targetUser,
    ...getInteractionIdentity(interaction),
    async reply(input) {
      await interaction.reply(renderInteractionReply(input))
    },
    async deferReply(input) {
      await interaction.deferReply(renderInteractionDefer(input))
    },
  }
}

export function toMessageCommandAdapter(
  interaction: MessageContextMenuCommandInteraction,
): MessageCommandInteractionAdapter {
  return {
    kind: 'messageCommand',
    commandName: interaction.commandName,
    targetMessage: interaction.targetMessage,
    ...getInteractionIdentity(interaction),
    async reply(input) {
      await interaction.reply(renderInteractionReply(input))
    },
    async deferReply(input) {
      await interaction.deferReply(renderInteractionDefer(input))
    },
  }
}

export function toButtonAdapter(interaction: ButtonInteraction): ButtonInteractionAdapter {
  return {
    kind: 'button',
    customId: interaction.customId,
    ...getInteractionIdentity(interaction),
    async update(input) {
      await interaction.update(renderInteractionUpdate(input))
    },
    async reply(input) {
      await interaction.reply(renderInteractionReply(input))
    },
    async deferUpdate() {
      await interaction.deferUpdate()
    },
    async showModal(input) {
      await interaction.showModal(renderModal(input))
    },
  }
}

export function toSelectAdapter(interaction: StringSelectMenuInteraction): SelectInteractionAdapter {
  return {
    kind: 'select',
    customId: interaction.customId,
    values: interaction.values,
    ...getInteractionIdentity(interaction),
    async update(input) {
      await interaction.update(renderInteractionUpdate(input))
    },
    async reply(input) {
      await interaction.reply(renderInteractionReply(input))
    },
    async deferUpdate() {
      await interaction.deferUpdate()
    },
    async showModal(input) {
      await interaction.showModal(renderModal(input))
    },
  }
}

export function toModalAdapter(interaction: ModalSubmitInteraction): ModalInteractionAdapter {
  const fields = Object.fromEntries(
    Array.from(interaction.fields.fields.values())
      .filter((field): field is Extract<ModalData, { type: ComponentType.TextInput }> =>
        field.type === ComponentType.TextInput,
      )
      .map((field) => [field.customId, field.value]),
  )

  return {
    kind: 'modal',
    customId: interaction.customId,
    fields,
    ...getInteractionIdentity(interaction),
    async reply(input) {
      await interaction.reply(renderInteractionReply(input))
    },
    async defer(input) {
      await interaction.deferReply(renderInteractionDefer(input))
    },
  }
}

export async function handleInteraction<TServices>(
  interaction: Interaction,
  router: InteractionRouter<TServices>,
  createServices: () => Promise<TServices>,
  stores?: StorePorts,
): Promise<void> {
  if (interaction.isAutocomplete()) {
    const adapter = toAutocompleteAdapter(interaction)
    const services = await createServices()
    await router.dispatch(adapter, { services, stores })
    return
  }

  if (interaction.isChatInputCommand()) {
    const adapter = toChatInputAdapter(interaction)
    const services = await createServices()
    await router.dispatch(adapter, { services, stores })
    return
  }

  if (interaction.isUserContextMenuCommand()) {
    const adapter = toUserCommandAdapter(interaction)
    const services = await createServices()
    await router.dispatch(adapter, { services, stores })
    return
  }

  if (interaction.isMessageContextMenuCommand()) {
    const adapter = toMessageCommandAdapter(interaction)
    const services = await createServices()
    await router.dispatch(adapter, { services, stores })
    return
  }

  if (interaction.isButton()) {
    const adapter = toButtonAdapter(interaction)
    const services = await createServices()
    await router.dispatch(adapter, { services, stores })
    return
  }

  if (interaction.isStringSelectMenu()) {
    const adapter = toSelectAdapter(interaction)
    const services = await createServices()
    await router.dispatch(adapter, { services, stores })
    return
  }

  if (interaction.isModalSubmit()) {
    const adapter = toModalAdapter(interaction)
    const services = await createServices()
    await router.dispatch(adapter, { services, stores })
  }
}
