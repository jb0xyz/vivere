import { resolve } from 'node:path'
import { expect, test, vi } from 'vitest'
import { defineConfig } from '../config/define-config.js'
import { createDevPlan, createDevProcessManager } from './dev.js'

test('creates a dev plan from config discovery paths and custom entry', () => {
  const config = defineConfig({
    discovery: {
      commands: 'src/commands',
      events: 'src/events',
      components: 'src/components',
    },
    dev: { entry: 'src/bot.ts' },
  })

  expect(createDevPlan({ cwd: '/project', config })).toEqual({
    entryPath: resolve('/project/src/bot.ts'),
    watchPathList: [
      resolve('/project/vivere.config.ts'),
      resolve('/project/src/bot.ts'),
      resolve('/project/src/commands'),
      resolve('/project/src/events'),
      resolve('/project/src/components'),
    ],
  })
})

test('uses src/index.ts as the default dev entry', () => {
  const config = defineConfig({
    discovery: {
      commands: 'src/commands',
    },
  })

  expect(createDevPlan({ cwd: '/project', config })).toEqual({
    entryPath: resolve('/project/src/index.ts'),
    watchPathList: [
      resolve('/project/vivere.config.ts'),
      resolve('/project/src/index.ts'),
      resolve('/project/src/commands'),
    ],
  })
})

test('restarts the managed dev process', () => {
  const childList: Array<{ kill: ReturnType<typeof vi.fn> }> = []
  const spawnProcess = vi.fn(() => {
    const child = { kill: vi.fn(() => true) }
    childList.push(child)
    return child
  })
  const manager = createDevProcessManager({
    cwd: '/project',
    entryPath: '/project/src/index.ts',
    env: { NODE_ENV: 'development' },
    spawnProcess,
  })

  manager.start()
  manager.restart()
  manager.stop()

  expect(spawnProcess).toHaveBeenCalledTimes(2)
  expect(spawnProcess).toHaveBeenNthCalledWith(1, '/project/src/index.ts', '/project', { NODE_ENV: 'development' })
  expect(spawnProcess).toHaveBeenNthCalledWith(2, '/project/src/index.ts', '/project', { NODE_ENV: 'development' })
  expect(childList[0]?.kill).toHaveBeenCalledWith('SIGTERM')
  expect(childList[1]?.kill).toHaveBeenCalledWith('SIGTERM')
})
