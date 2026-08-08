export const HOME_CATEGORY_ORDER = [
  "categoryBingo",
  "categoryBoard",
  "categoryFocus",
  "categoryPuzzle",
  "categoryArcade",
  "categoryTools",
] as const

export function orderHomeCategories<T extends { titleKey: string }>(
  categories: readonly T[],
): T[] {
  const order = new Map<string, number>(
    HOME_CATEGORY_ORDER.map((titleKey, index) => [titleKey, index]),
  )

  return [...categories].sort((left, right) => {
    const leftIndex = order.get(left.titleKey) ?? Number.MAX_SAFE_INTEGER
    const rightIndex = order.get(right.titleKey) ?? Number.MAX_SAFE_INTEGER
    return leftIndex - rightIndex
  })
}
