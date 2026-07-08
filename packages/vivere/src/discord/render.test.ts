import { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, StringSelectMenuBuilder } from 'discord.js'
import { expect, test } from 'vitest'
import type { ReplyInput } from '../authoring/types.js'
import { renderInteractionReply, renderInteractionUpdate } from './render.js'

test('renders a neutral reply with a button row to Discord reply options', () => {
  const input: ReplyInput = {
    content: 'Confirm?',
    ephemeral: true,
    components: [
      {
        type: 'row',
        components: [
          {
            type: 'button',
            customId: 'c1:button:confirm::sig',
            label: 'Confirm',
            style: 'primary',
          },
        ],
      },
    ],
  }

  const output = renderInteractionReply(input)

  expect(output.content).toBe('Confirm?')
  expect(output.flags).toBe(MessageFlags.Ephemeral)
  const row = output.components?.[0] as ActionRowBuilder<ButtonBuilder> | undefined

  expect(row?.toJSON()).toEqual({
    type: 1,
    components: [
      {
        type: 2,
        custom_id: 'c1:button:confirm::sig',
        label: 'Confirm',
        style: ButtonStyle.Primary,
      },
    ],
  })
})

test('renders update input without ephemeral flags', () => {
  const output = renderInteractionUpdate({ content: 'Updated', ephemeral: true })

  expect(output).toEqual({ content: 'Updated' })
})

test('renders a neutral string select row to Discord reply options', () => {
  const input: ReplyInput = {
    content: 'Pick',
    components: [
      {
        type: 'row',
        components: [
          {
            type: 'select',
            customId: 'c1:select:pick-role::sig',
            placeholder: 'Choose',
            options: [{ label: 'Admin', value: 'admin' }],
          },
        ],
      },
    ],
  }

  const output = renderInteractionReply(input)
  const row = output.components?.[0] as ActionRowBuilder<StringSelectMenuBuilder> | undefined

  expect(row?.toJSON()).toEqual({
    type: 1,
    components: [
      {
        type: 3,
        custom_id: 'c1:select:pick-role::sig',
        placeholder: 'Choose',
        options: [{ label: 'Admin', value: 'admin' }],
      },
    ],
  })
})
