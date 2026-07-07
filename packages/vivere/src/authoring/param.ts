export type ParamKind = 'snowflake' | 'string' | 'boolean' | 'enum'

export interface ParamNode<TValue> {
  readonly kind: ParamKind
  encode(value: TValue): string
  decode(raw: string): TValue
}

export type ParamsRecord = Record<string, ParamNode<unknown>>

export type InferParams<TParams extends ParamsRecord> = {
  [K in keyof TParams]: TParams[K] extends ParamNode<infer TValue> ? TValue : never
}

function assertSnowflake(value: string): void {
  if (!/^\d{17,20}$/.test(value)) throw new Error(`Invalid snowflake param: ${value}`)
}

export const param = {
  snowflake(): ParamNode<string> {
    return {
      kind: 'snowflake',
      encode(value) {
        assertSnowflake(value)
        return value
      },
      decode(raw) {
        assertSnowflake(raw)
        return raw
      },
    }
  },
  string(maxLength: number): ParamNode<string> {
    return {
      kind: 'string',
      encode(value) {
        if (value.length > maxLength) throw new Error(`String param exceeds max length ${maxLength}`)
        return value
      },
      decode(raw) {
        if (raw.length > maxLength) throw new Error(`String param exceeds max length ${maxLength}`)
        return raw
      },
    }
  },
  boolean(): ParamNode<boolean> {
    return {
      kind: 'boolean',
      encode(value) {
        return value ? 'true' : 'false'
      },
      decode(raw) {
        if (raw === 'true') return true
        if (raw === 'false') return false
        throw new Error(`Invalid boolean param: ${raw}`)
      },
    }
  },
  enum<const TValue extends string>(values: readonly TValue[]): ParamNode<TValue> {
    return {
      kind: 'enum',
      encode(value) {
        if (!values.includes(value)) throw new Error(`Invalid enum param: ${value}`)
        return value
      },
      decode(raw) {
        if (!values.includes(raw as TValue)) throw new Error(`Invalid enum param: ${raw}`)
        return raw as TValue
      },
    }
  },
}
