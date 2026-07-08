import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { expect, test } from 'vitest'

test('authoring types and runtime router do not import discord.js', async () => {
  const typesPath = fileURLToPath(new URL('../authoring/types.ts', import.meta.url))
  const routerPath = fileURLToPath(new URL('router.ts', import.meta.url))
  const [typesSource, routerSource] = await Promise.all([readFile(typesPath, 'utf8'), readFile(routerPath, 'utf8')])

  expect(typesSource).not.toContain('discord.js')
  expect(routerSource).not.toContain('discord.js')
})
