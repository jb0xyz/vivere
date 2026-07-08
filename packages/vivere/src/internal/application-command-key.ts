import type { ApplicationCommandDescriptor } from '../authoring/ir.js'

export function getApplicationCommandKey(descriptor: ApplicationCommandDescriptor): string {
  if (descriptor.kind === 'command') return `command:${descriptor.route.join('/')}`
  return `${descriptor.kind}:${descriptor.name}`
}
