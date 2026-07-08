import { expect, test, vi } from 'vitest'
import { createVivere } from '../authoring/create-vivere.js'
import type { ActionRowSpec, ReplyInput } from '../authoring/types.js'
import { encodeCustomId } from './custom-id.js'
import { handleComponent } from './component-handler.js'

const secret = 'secret'
const { defineButton, param } = createVivere<{ mark(): void }>()

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
  expect(adapter.lastComponents?.[0]?.components[0]?.label).toBe('Again')
})

test('ignores invalid or unknown component custom ids', async () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

  await handleComponent(fakeButtonAdapter('c1:button:confirm:userId=123456789012345678:bad-signature'), {
    registry: new Map(),
    secret,
    deps: { services: { mark: () => {} } },
  })
  await handleComponent(fakeButtonAdapter(encodeCustomId('button', 'missing', {}, secret)), {
    registry: new Map(),
    secret,
    deps: { services: { mark: () => {} } },
  })

  expect(warn).toHaveBeenCalledTimes(2)
  warn.mockRestore()
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
  }
}
