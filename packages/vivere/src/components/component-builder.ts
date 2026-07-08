import type {
  ComponentsBuilder,
  ModalDefinitionForParams,
  ModalSpec,
  ShowModalOptions,
} from '../authoring/types.js'
import type { ComponentDescriptor, ParamDescriptor } from '../authoring/ir.js'
import { encodeCustomId } from './custom-id.js'

function encodeComponentParam(param: ParamDescriptor, value: unknown): string {
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

function encodeComponentParams(
  component: { descriptor: ComponentDescriptor },
  params: Record<string, unknown>,
): Record<string, string> {
  const encodedParams: Record<string, string> = {}
  for (const param of component.descriptor.params) {
    encodedParams[param.name] = encodeComponentParam(param, params[param.name])
  }
  return encodedParams
}

function encodeComponentCustomId(
  component: { descriptor: ComponentDescriptor },
  params: Record<string, unknown>,
  secret: string,
): string {
  return encodeCustomId(
    component.descriptor.componentKind,
    component.descriptor.id,
    encodeComponentParams(component, params),
    secret,
  )
}

export function createModalSpec<TParams extends Record<string, unknown>>(
  secret: string,
  modal: ModalDefinitionForParams<TParams>,
  options: ShowModalOptions<TParams>,
): ModalSpec {
  return {
    customId: encodeComponentCustomId(modal, options.params, secret),
    title: options.title,
    fields: modal.descriptor.fields.map((field) => ({
      key: field.name,
      label: field.label,
      style: field.style,
      required: field.required,
      ...(field.maxLength === undefined ? {} : { maxLength: field.maxLength }),
      ...(field.minLength === undefined ? {} : { minLength: field.minLength }),
      ...(field.placeholder === undefined ? {} : { placeholder: field.placeholder }),
    })),
  }
}

export function createComponentsBuilder(secret: string): ComponentsBuilder {
  return {
    button(button, options) {
      return {
        type: 'row',
        components: [
          {
            type: 'button',
            customId: encodeComponentCustomId(button, options.params, secret),
            label: options.label,
            style: options.style ?? 'primary',
          },
        ],
      }
    },
    select(select, options) {
      return {
        type: 'row',
        components: [
          {
            type: 'select',
            customId: encodeComponentCustomId(select, options.params, secret),
            placeholder: options.placeholder,
            options: options.options,
          },
        ],
      }
    },
  }
}
