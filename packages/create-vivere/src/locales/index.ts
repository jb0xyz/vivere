import { en } from './en.js'
import { ja } from './ja.js'
import { ko } from './ko.js'
import type { Catalog, Locale } from './types.js'

export type { Catalog, CatalogKey, Locale } from './types.js'

export const LOCALE_LIST = ['en', 'ko', 'ja'] as const

export const CATALOGS = {
  en,
  ko,
  ja,
} satisfies Record<Locale, Catalog>
