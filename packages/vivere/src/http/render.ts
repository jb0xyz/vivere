import type {
  ActionRowSpec,
  ButtonSpec,
  ButtonStyleName,
  ComponentSpec,
  DeferInput,
  ModalFieldSpec,
  ModalFieldStyleName,
  ModalSpec,
  ReplyInput,
  SelectSpec,
} from '../authoring/types.js'

export interface InteractionResponseBody {
  type: number
  data?: Record<string, unknown>
}

const MESSAGE_FLAG = {
  ephemeral: 64,
} as const

const BUTTON_STYLE = {
  primary: 1,
  secondary: 2,
  success: 3,
  danger: 4,
} satisfies Record<ButtonStyleName, number>

const MODAL_FIELD_STYLE = {
  short: 1,
  paragraph: 2,
} satisfies Record<ModalFieldStyleName, number>

function renderButton(button: ButtonSpec): Record<string, unknown> {
  return {
    type: 2,
    custom_id: button.customId,
    label: button.label,
    style: BUTTON_STYLE[button.style],
  }
}

function renderSelect(select: SelectSpec): Record<string, unknown> {
  return {
    type: 3,
    custom_id: select.customId,
    ...(select.placeholder ? { placeholder: select.placeholder } : {}),
    options: select.options,
  }
}

function renderComponent(component: ComponentSpec): Record<string, unknown> {
  if (component.type === 'button') return renderButton(component)
  return renderSelect(component)
}

function renderActionRow(row: ActionRowSpec): Record<string, unknown> {
  return {
    type: 1,
    components: row.components.map(renderComponent),
  }
}

function renderMessageData(input: ReplyInput, options: { includeEphemeral: boolean }): Record<string, unknown> {
  if (typeof input === 'string') return { content: input }

  return {
    content: input.content,
    ...(options.includeEphemeral && input.ephemeral ? { flags: MESSAGE_FLAG.ephemeral } : {}),
    ...(input.components ? { components: input.components.map(renderActionRow) } : {}),
  }
}

function renderDeferData(input?: DeferInput): Record<string, unknown> | undefined {
  if (!input?.ephemeral) return undefined
  return { flags: MESSAGE_FLAG.ephemeral }
}

function renderModalField(field: ModalFieldSpec): Record<string, unknown> {
  return {
    type: 4,
    custom_id: field.key,
    label: field.label,
    style: MODAL_FIELD_STYLE[field.style],
    required: field.required,
    ...(field.maxLength === undefined ? {} : { max_length: field.maxLength }),
    ...(field.minLength === undefined ? {} : { min_length: field.minLength }),
    ...(field.placeholder === undefined ? {} : { placeholder: field.placeholder }),
  }
}

export function renderPongResponse(): InteractionResponseBody {
  return { type: 1 }
}

export function renderReplyResponse(input: ReplyInput): InteractionResponseBody {
  return {
    type: 4,
    data: renderMessageData(input, { includeEphemeral: true }),
  }
}

export function renderDeferredReplyResponse(input?: DeferInput): InteractionResponseBody {
  const data = renderDeferData(input)
  return data ? { type: 5, data } : { type: 5 }
}

export function renderDeferredUpdateResponse(): InteractionResponseBody {
  return { type: 6 }
}

export function renderUpdateResponse(input: ReplyInput): InteractionResponseBody {
  return {
    type: 7,
    data: renderMessageData(input, { includeEphemeral: false }),
  }
}

export function renderAutocompleteResponse(choices: unknown[]): InteractionResponseBody {
  return {
    type: 8,
    data: { choices },
  }
}

export function renderModalResponse(input: ModalSpec): InteractionResponseBody {
  return {
    type: 9,
    data: {
      custom_id: input.customId,
      title: input.title,
      components: input.fields.map((field) => ({
        type: 1,
        components: [renderModalField(field)],
      })),
    },
  }
}
