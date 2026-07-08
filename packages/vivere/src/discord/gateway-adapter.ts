import type { ButtonInteraction, ChatInputCommandInteraction, Interaction, StringSelectMenuInteraction } from 'discord.js'
import type { ReplyInput } from '../authoring/types.js'
import type {
  ButtonInteractionAdapter,
  ChatInputInteractionAdapter,
  SelectInteractionAdapter,
} from '../runtime/interaction-adapter.js'
import type { InteractionRouter } from '../runtime/router.js'
import { DISCORD_OPTION_KIND } from './option-kinds.js'
import { renderInteractionDefer, renderInteractionReply, renderInteractionUpdate } from './render.js'

export function toChatInputAdapter(
  interaction: ChatInputCommandInteraction,
): ChatInputInteractionAdapter {
  return {
    kind: 'command',
    commandName: interaction.commandName,
    getOption(name, kind, required) {
      return DISCORD_OPTION_KIND[kind].get(interaction.options, name, required)
    },
    async reply(input: ReplyInput) {
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
    async update(input) {
      await interaction.update(renderInteractionUpdate(input))
    },
    async reply(input) {
      await interaction.reply(renderInteractionReply(input))
    },
    async deferUpdate() {
      await interaction.deferUpdate()
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
  }
}

export async function handleInteraction<TServices>(
  interaction: Interaction,
  router: InteractionRouter<TServices>,
  createServices: () => Promise<TServices>,
): Promise<void> {
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
  }
}
