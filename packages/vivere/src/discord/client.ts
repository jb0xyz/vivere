import { MessageFlags } from 'discord.js'
import type { ButtonInteraction, ChatInputCommandInteraction, Interaction } from 'discord.js'
import type { InteractionReplyOptions, InteractionUpdateOptions } from 'discord.js'
import type { ReplyInput } from '../authoring/types.js'
import type { ButtonInteractionAdapter, ChatInputInteractionAdapter } from '../runtime/interaction-adapter.js'
import type { InteractionRouter } from '../runtime/router.js'
import { DISCORD_OPTION_KIND } from './option-kinds.js'

function toInteractionReply(input: ReplyInput): InteractionReplyOptions {
  if (typeof input === 'string') return { content: input }

  const output: InteractionReplyOptions = {
    content: input.content,
  }
  if (input.ephemeral) output.flags = MessageFlags.Ephemeral
  if (input.components) output.components = input.components
  return output
}

function toInteractionUpdate(input: ReplyInput): InteractionUpdateOptions {
  if (typeof input === 'string') return { content: input }

  const output: InteractionUpdateOptions = {
    content: input.content,
  }
  if (input.components) output.components = input.components
  return output
}

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
      await interaction.reply(toInteractionReply(input))
    },
    async deferReply(input) {
      await interaction.deferReply(input?.ephemeral ? { flags: MessageFlags.Ephemeral } : undefined)
    },
  }
}

export function toButtonAdapter(interaction: ButtonInteraction): ButtonInteractionAdapter {
  return {
    kind: 'button',
    customId: interaction.customId,
    async update(input) {
      await interaction.update(toInteractionUpdate(input))
    },
    async reply(input) {
      await interaction.reply(toInteractionReply(input))
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
  }
}
