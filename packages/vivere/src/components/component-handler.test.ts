import { expect, test, vi } from 'vitest'
import { createVivere } from '../authoring/create-vivere.js'
import type { ActionRowSpec, ReplyInput } from '../authoring/types.js'
import { encodeCustomId } from './custom-id.js'
import { handleComponent } from './component-handler.js'

const secret = 'secret'
const { defineButton, defineModal, defineSelect, field, param } = createVivere<{ mark(): void }>()

test('handles signed component custom ids through the component registry', async () => {
  let seenParams: unknown
  const mark = vi.fn()
  const confirm = defineButton({
    id: 'confirm',
    params: { userId: param.snowflake() },
    async execute(ctx) {
      ctx.services.mark()
      seenParams = ctx.params
      await ctx.update({
        content: 'confirmed',
        components: [
          ctx.components.button(confirm, {
            params: { userId: '123456789012345678' },
            label: 'Again',
            style: 'secondary',
          }),
        ],
      })
    },
  })
  const adapter = fakeButtonAdapter(encodeCustomId('button', 'confirm', { userId: '123456789012345678' }, secret))

  await handleComponent(adapter, {
    registry: new Map([['button:confirm', confirm]]),
    secret,
    deps: { services: { mark } },
  })

  expect(mark).toHaveBeenCalledOnce()
  expect(seenParams).toEqual({ userId: '123456789012345678' })
  expect(adapter.updated).toEqual(['confirmed'])
  const component = adapter.lastComponents?.[0]?.components[0]
  expect(component?.type).toBe('button')
  if (component?.type === 'button') expect(component.label).toBe('Again')
})

test('handles select values through the shared component pipeline', async () => {
  let seen: unknown
  const mark = vi.fn()
  const pickRole = defineSelect({
    id: 'pick-role',
    params: { userId: param.snowflake() },
    async execute(ctx) {
      ctx.services.mark()
      seen = { params: ctx.params, values: ctx.values }
      await ctx.update('picked')
    },
  })
  const adapter = fakeSelectAdapter(
    encodeCustomId('select', 'pick-role', { userId: '123456789012345678' }, secret),
    ['admin'],
  )

  await handleComponent(adapter, {
    registry: new Map([['select:pick-role', pickRole]]),
    secret,
    deps: { services: { mark } },
  })

  expect(mark).toHaveBeenCalledOnce()
  expect(seen).toEqual({ params: { userId: '123456789012345678' }, values: ['admin'] })
  expect(adapter.updated).toEqual(['picked'])
})

test('handles modal fields through the shared component pipeline', async () => {
  let seen: unknown
  const mark = vi.fn()
  const feedback = defineModal({
    id: 'feedback',
    params: { userId: param.snowflake() },
    fields: {
      subject: field.short('Subject', { required: true }),
      body: field.paragraph('Details'),
    },
    async execute(ctx) {
      ctx.services.mark()
      seen = { params: ctx.params, fields: ctx.fields }
      await ctx.reply('saved')
    },
  })
  const adapter = fakeModalAdapter(
    encodeCustomId('modal', 'feedback', { userId: '123456789012345678' }, secret),
    { subject: 'Hi', body: 'Details' },
  )

  await handleComponent(adapter, {
    registry: new Map([['modal:feedback', feedback]]),
    secret,
    deps: { services: { mark } },
  })

  expect(mark).toHaveBeenCalledOnce()
  expect(seen).toEqual({
    params: { userId: '123456789012345678' },
    fields: { subject: 'Hi', body: 'Details' },
  })
  expect(adapter.replied).toEqual(['saved'])
})

test('ignores invalid or unknown component custom ids', async () => {
  const reportError = vi.fn()

  await handleComponent(fakeButtonAdapter('c1:button:confirm:userId=123456789012345678:bad-signature'), {
    registry: new Map(),
    secret,
    deps: { services: { mark: () => {} } },
    reportError,
  })
  await handleComponent(fakeButtonAdapter(encodeCustomId('button', 'missing', {}, secret)), {
    registry: new Map(),
    secret,
    deps: { services: { mark: () => {} } },
    reportError,
  })

  expect(reportError).toHaveBeenCalledTimes(2)
  expect(reportError).toHaveBeenNthCalledWith(1, expect.any(Error), { phase: 'component', kind: 'button' })
  expect(reportError).toHaveBeenNthCalledWith(
    2,
    'Unknown component customId: button:missing',
    { phase: 'component', kind: 'button', id: 'missing' },
  )
})

function fakeButtonAdapter(customId: string) {
  const updated: string[] = []
  let lastComponents: ActionRowSpec[] | undefined
  return {
    kind: 'button' as const,
    customId,
    updated,
    get lastComponents() {
      return lastComponents
    },
    async update(input: ReplyInput) {
      updated.push(typeof input === 'string' ? input : input.content)
      if (typeof input !== 'string') lastComponents = input.components
    },
    async reply() {},
    async deferUpdate() {},
    async showModal() {},
  }
}

function fakeSelectAdapter(customId: string, values: string[]) {
  return {
    ...fakeButtonAdapter(customId),
    kind: 'select' as const,
    values,
  }
}

function fakeModalAdapter(customId: string, fields: Record<string, string>) {
  const replied: string[] = []
  return {
    kind: 'modal' as const,
    customId,
    fields,
    replied,
    async reply(input: ReplyInput) {
      replied.push(typeof input === 'string' ? input : input.content)
    },
    async defer() {},
  }
}
