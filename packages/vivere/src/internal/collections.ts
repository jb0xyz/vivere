export function assertUnique(items: readonly string[], label: string): void {
  const seen = new Set<string>()
  for (const item of items) {
    if (seen.has(item)) throw new Error(`Duplicate ${label} "${item}"`)
    seen.add(item)
  }
}

export function createRegistry<TItem, TKey>(items: readonly TItem[], keyOf: (item: TItem) => TKey): Map<TKey, TItem> {
  return new Map(items.map((item) => [keyOf(item), item] as const))
}
