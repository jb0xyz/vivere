import { MessageFlags } from 'discord.js'
import type { ButtonInteraction, ChatInputCommandInteraction, Interaction } from 'discord.js'
import type { InteractionReplyOptions, InteractionUpdateOptions } from 'discord.js'
import type { ReplyInput } from '../authoring/types.js'
import type { ButtonInteractionAdapter, ChatInputInteractionAdapter } from '../runtime/interaction-adapter.js'
import type { InteractionRouter } from '../runtime/router.js'

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
    commandName: interaction.commandName,
    getOption(name, kind, required) {
      const o = interaction.options
      switch (kind) {
        case 'string':
          return o.getString(name, required) ?? undefined
        case 'integer':
          return o.getInteger(name, required) ?? undefined
        case 'number':
          return o.getNumber(name, required) ?? undefined
        case 'boolean':
          return o.getBoolean(name, required) ?? undefined
        case 'user':
          return o.getUser(name, required) ?? undefined
        case 'role':
          return o.getRole(name, required) ?? undefined
        case 'attachment':
          return o.getAttachment(name, required) ?? undefined
      }
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
    await router.dispatchCommand(adapter, { services })
    return
  }

  if (interaction.isButton()) {
    const adapter = toButtonAdapter(interaction)
    const services = await createServices()
    await router.dispatchButton(adapter, { services })
  }
}
