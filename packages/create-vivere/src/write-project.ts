import { mkdir, readdir, stat, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import type { FileMap } from './scaffold.js'

export async function assertWritableTarget(targetDir: string): Promise<void> {
  try {
    const targetStat = await stat(targetDir)
    if (!targetStat.isDirectory()) throw new Error(`${targetDir} already exists and is not a directory`)
    const entryList = await readdir(targetDir)
    if (entryList.length > 0) throw new Error(`${targetDir} already exists and is not empty`)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return
    throw error
  }
}

export async function writeFileMap(targetDir: string, files: FileMap): Promise<void> {
  await mkdir(targetDir, { recursive: true })
  await Promise.all(
    Object.entries(files).map(async ([path, content]) => {
      const targetPath = join(targetDir, path)
      await mkdir(dirname(targetPath), { recursive: true })
      await writeFile(targetPath, content)
    }),
  )
}
