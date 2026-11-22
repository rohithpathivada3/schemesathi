export const RECENTLY_VIEWED_STORAGE_KEY = 'schemesathi_recently_viewed_v1'
const MAX_RECENT_SCHEMES = 5

type ActivityStorage = Pick<Storage, 'getItem' | 'setItem'>

export type RecentlyViewedState = {
  schemeIds: string[]
  persistenceAvailable: boolean
}

export function loadRecentlyViewed(
  validSchemeIds: string[],
  storage?: ActivityStorage
): RecentlyViewedState {
  try {
    const stored = (storage ?? window.localStorage).getItem(RECENTLY_VIEWED_STORAGE_KEY)
    if (stored === null) return { schemeIds: [], persistenceAvailable: true }
    const parsed: unknown = JSON.parse(stored)
    if (!Array.isArray(parsed)) return { schemeIds: [], persistenceAvailable: false }
    const validIds = new Set(validSchemeIds)
    const schemeIds = [...new Set(parsed.filter((id): id is string =>
      typeof id === 'string' && validIds.has(id)
    ))].slice(0, MAX_RECENT_SCHEMES)
    return { schemeIds, persistenceAvailable: true }
  } catch {
    return { schemeIds: [], persistenceAvailable: false }
  }
}

export function saveRecentlyViewed(
  schemeIds: string[],
  validSchemeIds: string[],
  storage?: ActivityStorage
): boolean {
  try {
    const validIds = new Set(validSchemeIds)
    const cleaned = [...new Set(schemeIds.filter((id) => validIds.has(id)))]
      .slice(0, MAX_RECENT_SCHEMES)
    const activityStorage = storage ?? window.localStorage
    activityStorage.setItem(
      RECENTLY_VIEWED_STORAGE_KEY,
      JSON.stringify(cleaned)
    )
    return true
  } catch {
    return false
  }
}
