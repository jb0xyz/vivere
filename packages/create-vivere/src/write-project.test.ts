import { mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test } from 'vitest'
import { assertWritableTarget, writeFileMap } from './write-project.js'

test('writes every file in a file map', async () => {
  const root = await mkdtemp(join(tmpdir(), 'vivere-create-'))
  const target = join(root, 'my-bot')

  await writeFileMap(target, {
    'README.md': '# my-bot\n',
    'src/index.ts': 'export {}\n',
  })

  expect(await readFile(join(target, 'README.md'), 'utf8')).toBe('# my-bot\n')
  expect(await readFile(join(target, 'src/index.ts'), 'utf8')).toBe('export {}\n')
})

test('allows missing and empty target directories', async () => {
  const root = await mkdtemp(join(tmpdir(), 'vivere-create-'))
  const emptyTarget = join(root, 'empty')

  await assertWritableTarget(join(root, 'missing'))
  await writeFileMap(emptyTarget, {})
  await assertWritableTarget(emptyTarget)

  expect(await readdir(emptyTarget)).toEqual([])
})

test('rejects non-empty target directories', async () => {
  const root = await mkdtemp(join(tmpdir(), 'vivere-create-'))
  const target = join(root, 'taken')
  await writeFileMap(target, {})
  await writeFile(join(target, 'README.md'), '# taken\n')

  await expect(assertWritableTarget(target)).rejects.toThrow('already exists and is not empty')
})
