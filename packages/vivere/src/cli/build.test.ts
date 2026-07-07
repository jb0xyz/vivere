import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterEach, expect, test } from 'vitest'
import { runBuild } from './build.js'

const tmpRoot = join(process.cwd(), 'tmp-test-project')
const packageRoot = resolve(process.cwd(), '..', '..')
const configSpecifier = pathToFileURL(join(packageRoot, 'packages/vivere/src/config/define-config.ts')).href
const createVivereSpecifier = pathToFileURL(join(packageRoot, 'packages/vivere/src/authoring/create-vivere.ts')).href

afterEach(async () => {
  await rm(tmpRoot, { recursive: true, force: true })
})

async function writeProject(): Promise<void> {
  await mkdir(join(tmpRoot, 'src/commands'), { recursive: true })
  await mkdir(join(tmpRoot, 'src/events'), { recursive: true })
  await mkdir(join(tmpRoot, 'src/components'), { recursive: true })
  await writeFile(
    join(tmpRoot, 'vivere.config.ts'),
    [
      `import { defineConfig } from '${configSpecifier}'`,
      'export default defineConfig({',
      "  discovery: { commands: 'src/commands', events: 'src/events', components: 'src/components' },",
      "  devGuildId: 'guild-1',",
      '})',
    ].join('\n'),
  )
  await writeFile(
    join(tmpRoot, 'src/commands/ping.ts'),
    [
      `import { createVivere } from '${createVivereSpecifier}'`,
      'const { defineCommand, opt } = createVivere()',
      'export default defineCommand({',
      "  name: 'ping',",
      "  description: 'Pong',",
      "  options: { targetUser: opt.user('target') },",
      '  async execute() {},',
      '})',
    ].join('\n'),
  )
  await writeFile(
    join(tmpRoot, 'src/events/ready.ts'),
    [
      `import { createVivere } from '${createVivereSpecifier}'`,
      'const { defineEvent } = createVivere()',
      "export default defineEvent({ name: 'ready', once: true, async execute() {} })",
    ].join('\n'),
  )
  await writeFile(
    join(tmpRoot, 'src/components/confirm.ts'),
    [
      `import { createVivere } from '${createVivereSpecifier}'`,
      'const { defineButton, param } = createVivere()',
      "export default defineButton({ id: 'confirm', params: { userId: param.snowflake() }, async execute() {} })",
    ].join('\n'),
  )
}

test('writes manifest from configured TypeScript files', async () => {
  await writeProject()

  const result = await runBuild({ cwd: tmpRoot, check: false })
  const json = await readFile(result.manifestPath, 'utf8')

  expect(result.changed).toBe(true)
  expect(JSON.parse(json)).toEqual({
    schemaVersion: 1,
    commands: [
      {
        kind: 'command',
        name: 'ping',
        description: 'Pong',
        route: ['ping'],
        options: [{ property: 'targetUser', name: 'target-user', kind: 'user', description: 'target', required: true }],
      },
    ],
    events: [{ kind: 'event', name: 'ready', once: true }],
    buttons: [{ kind: 'button', componentKind: 'button', id: 'confirm', params: [{ name: 'userId', kind: 'snowflake' }] }],
  })
})

test('check reports unchanged manifest without writing', async () => {
  await writeProject()
  const first = await runBuild({ cwd: tmpRoot, check: false })

  const result = await runBuild({ cwd: tmpRoot, check: true })

  expect(result).toEqual({ manifestPath: first.manifestPath, changed: false })
})

test('check reports drift or missing manifest without writing', async () => {
  await writeProject()
  const result = await runBuild({ cwd: tmpRoot, check: true })

  await expect(readFile(result.manifestPath, 'utf8')).rejects.toThrow()
  expect(result.changed).toBe(true)
})
