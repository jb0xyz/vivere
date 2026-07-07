import { MessageFlags } from 'discord.js'
import type { ChatInputCommandInteraction, Interaction } from 'discord.js'
import type { ReplyInput } from '../authoring/types.js'
import type { ChatInputInteractionAdapter } from '../runtime/interaction-adapter.js'
import type { InteractionRouter } from '../runtime/router.js'

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
      if (typeof input === 'string') {
        await interaction.reply({ content: input })
        return
      }
      await interaction.reply({
        content: input.content,
        ...(input.ephemeral ? { flags: MessageFlags.Ephemeral } : {}),
      })
    },
    async deferReply(input) {
      await interaction.deferReply(input?.ephemeral ? { flags: MessageFlags.Ephemeral } : undefined)
    },
  }
}

export async function handleInteraction<TServices>(
  interaction: Interaction,
  router: InteractionRouter<TServices>,
  createServices: () => Promise<TServices>,
): Promise<void> {
  if (!interaction.isChatInputCommand()) return
  const adapter = toChatInputAdapter(interaction)
  const services = await createServices()
  await router.dispatch(adapter, { services })
}
