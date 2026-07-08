import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { afterEach, expect, test, vi } from 'vitest'
import { runSync } from './sync.js'

const tmpRoot = join(process.cwd(), 'tmp-sync-project')
const tmpRootNoGuild = join(process.cwd(), 'tmp-sync-project-no-guild')
const packageRoot = fileURLToPath(new URL('../../../../', import.meta.url))
const configSpecifier = pathToFileURL(join(packageRoot, 'packages/vivere/src/config/define-config.ts')).href
const createVivereSpecifier = pathToFileURL(join(packageRoot, 'packages/vivere/src/authoring/create-vivere.ts')).href

afterEach(async () => {
  await rm(tmpRoot, { recursive: true, force: true })
  await rm(tmpRootNoGuild, { recursive: true, force: true })
})

async function writeProject(root = tmpRoot, hasGuild = true): Promise<void> {
  await mkdir(join(root, 'src/commands/admin'), { recursive: true })
  await writeFile(
    join(root, 'vivere.config.ts'),
    [
      `import { defineConfig } from '${configSpecifier}'`,
      'export default defineConfig({',
      "  discovery: { commands: 'src/commands' },",
      ...(hasGuild ? ["  devGuildId: 'guild-1',"] : []),
      '})',
    ].join('\n'),
  )
  await writeFile(
    join(root, 'src/commands/admin/index.ts'),
    [
      `import { createVivere } from '${createVivereSpecifier}'`,
      'const { defineCommand } = createVivere()',
      "export default defineCommand({ name: 'admin', description: 'Admin commands' })",
    ].join('\n'),
  )
  await writeFile(
    join(root, 'src/commands/admin/ban.ts'),
    [
      `import { createVivere } from '${createVivereSpecifier}'`,
      'const { defineCommand } = createVivere()',
      "export default defineCommand({ name: 'ban', description: 'Ban a user', async execute() {} })",
    ].join('\n'),
  )
}

test('syncs discovered commands to the configured guild', async () => {
  await writeProject()
  const put = vi.fn(async () => ({}))
  const get = vi.fn(async () => ({ id: 'app-1' }))
  const eventList: unknown[] = []

  const result = await runSync({
    cwd: tmpRoot,
    global: false,
    env: { DISCORD_TOKEN: 'token' },
    createRest: () => ({ get, put }),
    onEvent: (event) => eventList.push(event),
  })

  expect(result).toEqual({ commandCount: 1, scope: 'guild' })
  expect(get).toHaveBeenCalledWith('/applications/@me')
  expect(put).toHaveBeenCalledWith('/applications/app-1/guilds/guild-1/commands', {
    body: [
      {
        name: 'admin',
        description: 'Admin commands',
        type: 1,
        options: [{ name: 'ban', description: 'Ban a user', type: 1, options: [] }],
      },
    ],
  })
  expect(eventList).toEqual([{ type: 'sync.completed', guildId: 'guild-1', count: 1 }])
})

test('syncs globally when requested', async () => {
  await writeProject()
  const put = vi.fn(async () => ({}))
  const get = vi.fn(async () => ({ id: 'app-1' }))

  const result = await runSync({
    cwd: tmpRoot,
    global: true,
    env: { DISCORD_TOKEN: 'token' },
    createRest: () => ({ get, put }),
  })

  expect(result).toEqual({ commandCount: 1, scope: 'global' })
  expect(put).toHaveBeenCalledWith('/applications/app-1/commands', expect.any(Object))
})

test('fails clearly without token or guild target', async () => {
  await writeProject()

  await expect(runSync({ cwd: tmpRoot, global: false, env: {}, createRest: () => ({ get: vi.fn(), put: vi.fn() }) }))
    .rejects.toThrow('DISCORD_TOKEN is required for vivere sync')

  await writeProject(tmpRootNoGuild, false)
  await expect(
    runSync({
      cwd: tmpRootNoGuild,
      global: false,
      env: { DISCORD_TOKEN: 'token' },
      createRest: () => ({ get: vi.fn(async () => ({ id: 'app-1' })), put: vi.fn() }),
    }),
  ).rejects.toThrow('devGuildId is required for vivere sync')
})
