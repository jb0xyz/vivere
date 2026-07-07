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

export async function handleInteraction(
  interaction: Interaction,
  router: InteractionRouter,
  createServices: () => Promise<unknown>,
): Promise<void> {
  if (!interaction.isChatInputCommand()) return
  const adapter = toChatInputAdapter(interaction)
  const services = await createServices()
  await router.dispatch(adapter, { services })
}
