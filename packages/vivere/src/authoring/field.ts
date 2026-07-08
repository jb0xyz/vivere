export type FieldKind = 'short' | 'paragraph'

export interface FieldOptions {
  required?: boolean
  maxLength?: number
  minLength?: number
  placeholder?: string
}

export interface FieldNode {
  readonly style: FieldKind
  readonly label: string
  readonly required: boolean
  readonly maxLength?: number
  readonly minLength?: number
  readonly placeholder?: string
}

export type FieldsRecord = Record<string, FieldNode>

export type InferFields<TFields extends FieldsRecord> = {
  [K in keyof TFields]: string
}

function createField(style: FieldKind, label: string, options: FieldOptions = {}): FieldNode {
  return {
    style,
    label,
    required: options.required ?? false,
    ...(options.maxLength === undefined ? {} : { maxLength: options.maxLength }),
    ...(options.minLength === undefined ? {} : { minLength: options.minLength }),
    ...(options.placeholder === undefined ? {} : { placeholder: options.placeholder }),
  }
}

export const field = {
  short(label: string, options?: FieldOptions): FieldNode {
    return createField('short', label, options)
  },
  paragraph(label: string, options?: FieldOptions): FieldNode {
    return createField('paragraph', label, options)
  },
}
