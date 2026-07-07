import { expect, test, vi } from 'vitest'
import { createVivere } from '../authoring/create-vivere.js'
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
      await ctx.update('confirmed')
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
  return {
    kind: 'button' as const,
    customId,
    updated,
    async update(input: string | { content: string }) {
      updated.push(typeof input === 'string' ? input : input.content)
    },
    async reply() {},
    async deferUpdate() {},
  }
}
