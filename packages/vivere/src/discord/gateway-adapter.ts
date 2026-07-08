import type {
  AutocompleteInteraction,
  ButtonInteraction,
  ChatInputCommandInteraction,
  Interaction,
  ModalData,
  ModalSubmitInteraction,
  StringSelectMenuInteraction,
} from 'discord.js'
import { ComponentType } from 'discord.js'
import type { ReplyInput } from '../authoring/types.js'
import type {
  AutocompleteInteractionAdapter,
  ButtonInteractionAdapter,
  ChatInputInteractionAdapter,
  ModalInteractionAdapter,
  SelectInteractionAdapter,
} from '../runtime/interaction-adapter.js'
import type { InteractionRouter } from '../runtime/router.js'
import { DISCORD_OPTION_KIND } from './option-kinds.js'
import { renderInteractionDefer, renderInteractionReply, renderInteractionUpdate, renderModal } from './render.js'

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
    async respond(choices) {
      await interaction.respond(choices)
    },
  }
}

export function toButtonAdapter(interaction: ButtonInteraction): ButtonInteractionAdapter {
  return {
    kind: 'button',
    customId: interaction.customId,
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
): Promise<void> {
  if (interaction.isAutocomplete()) {
    const adapter = toAutocompleteAdapter(interaction)
    const services = await createServices()
    await router.dispatch(adapter, { services })
    return
  }

  if (interaction.isChatInputCommand()) {
    const adapter = toChatInputAdapter(interaction)
    const services = await createServices()
    await router.dispatch(adapter, { services })
    return
  }

  if (interaction.isButton()) {
    const adapter = toButtonAdapter(interaction)
    const services = await createServices()
    await router.dispatch(adapter, { services })
    return
  }

  if (interaction.isStringSelectMenu()) {
    const adapter = toSelectAdapter(interaction)
    const services = await createServices()
    await router.dispatch(adapter, { services })
    return
  }

  if (interaction.isModalSubmit()) {
    const adapter = toModalAdapter(interaction)
    const services = await createServices()
    await router.dispatch(adapter, { services })
  }
}
