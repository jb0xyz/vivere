import type { Services } from './vivere.js'

export async function createServices(): Promise<Services> {
  return { logger: { info: (m) => console.log(`[bot] ${m}`) } }
}
