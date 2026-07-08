import type { ButtonDefinitionForParams, ComponentsBuilder } from '../authoring/types.js'
import type { ParamDescriptor } from '../authoring/ir.js'
import { encodeCustomId } from './custom-id.js'

function encodeButtonParam(param: ParamDescriptor, value: unknown): string {
  switch (param.kind) {
    case 'snowflake':
      if (typeof value !== 'string' || !/^\d{17,20}$/.test(value)) throw new Error(`Invalid snowflake param: ${value}`)
      return value
    case 'string':
      if (typeof value !== 'string') throw new Error(`Invalid string param: ${value}`)
      if (param.maxLength !== undefined && value.length > param.maxLength) {
        throw new Error(`String param exceeds max length ${param.maxLength}`)
      }
      return value
    case 'boolean':
      if (typeof value !== 'boolean') throw new Error(`Invalid boolean param: ${value}`)
      return value ? 'true' : 'false'
    case 'enum':
      if (typeof value !== 'string' || !param.values?.includes(value)) throw new Error(`Invalid enum param: ${value}`)
      return value
  }
}

function encodeButtonParams(
  button: ButtonDefinitionForParams<Record<string, unknown>>,
  params: Record<string, unknown>,
): Record<string, string> {
  const encodedParams: Record<string, string> = {}
  for (const param of button.descriptor.params) {
    encodedParams[param.name] = encodeButtonParam(param, params[param.name])
  }
  return encodedParams
}

export function createComponentsBuilder(secret: string): ComponentsBuilder {
  return {
    button(button, options) {
      return {
        type: 'row',
        components: [
          {
            type: 'button',
            customId: encodeCustomId(
              button.descriptor.componentKind,
              button.descriptor.id,
              encodeButtonParams(button, options.params),
              secret,
            ),
            label: options.label,
            style: options.style ?? 'primary',
          },
        ],
      }
    },
  }
}
