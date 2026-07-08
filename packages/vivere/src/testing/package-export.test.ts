import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { expect, test } from 'vitest'

test('declares the testing subpath export', async () => {
  const packagePath = fileURLToPath(new URL('../../package.json', import.meta.url))
  const packageJson = JSON.parse(await readFile(packagePath, 'utf8')) as {
    exports: Record<string, { types: string; import: string }>
  }

  expect(packageJson.exports['./testing']).toEqual({
    types: './dist/testing.d.ts',
    import: './dist/testing.js',
  })
})
