import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  StringSelectMenuBuilder,
} from 'discord.js'
import type { InteractionDeferReplyOptions, InteractionReplyOptions, InteractionUpdateOptions } from 'discord.js'
import type {
  ActionRowSpec,
  ButtonSpec,
  ButtonStyleName,
  ComponentSpec,
  DeferInput,
  ReplyInput,
  SelectSpec,
} from '../authoring/types.js'

const BUTTON_STYLE = {
  primary: ButtonStyle.Primary,
  secondary: ButtonStyle.Secondary,
  success: ButtonStyle.Success,
  danger: ButtonStyle.Danger,
} satisfies Record<ButtonStyleName, ButtonStyle>

function renderButton(button: ButtonSpec): ButtonBuilder {
  return new ButtonBuilder()
    .setCustomId(button.customId)
    .setLabel(button.label)
    .setStyle(BUTTON_STYLE[button.style])
}

function renderSelect(select: SelectSpec): StringSelectMenuBuilder {
  const builder = new StringSelectMenuBuilder()
    .setCustomId(select.customId)
    .setOptions(select.options)
  if (select.placeholder) builder.setPlaceholder(select.placeholder)
  return builder
}

function renderComponent(component: ComponentSpec): ButtonBuilder | StringSelectMenuBuilder {
  if (component.type === 'button') return renderButton(component)
  return renderSelect(component)
}

function renderActionRow(row: ActionRowSpec): ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder> {
  return new ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>().addComponents(row.components.map(renderComponent))
}

export function renderInteractionReply(input: ReplyInput): InteractionReplyOptions {
  if (typeof input === 'string') return { content: input }

  const output: InteractionReplyOptions = {
    content: input.content,
  }
  if (input.ephemeral) output.flags = MessageFlags.Ephemeral
  if (input.components) output.components = input.components.map(renderActionRow)
  return output
}

export function renderInteractionDefer(input?: DeferInput): InteractionDeferReplyOptions | undefined {
  return input?.ephemeral ? { flags: MessageFlags.Ephemeral } : undefined
}

export function renderInteractionUpdate(input: ReplyInput): InteractionUpdateOptions {
  if (typeof input === 'string') return { content: input }

  const output: InteractionUpdateOptions = {
    content: input.content,
  }
  if (input.components) output.components = input.components.map(renderActionRow)
  return output
}
