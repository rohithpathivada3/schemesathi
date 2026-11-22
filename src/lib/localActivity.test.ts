import { describe, expect, it } from 'vitest'
import { loadRecentlyViewed, RECENTLY_VIEWED_STORAGE_KEY, saveRecentlyViewed } from './localActivity'

function createStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial))
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    values,
  }
}

describe('recently viewed schemes', () => {
  it('stores only known IDs, deduplicates them, and keeps the five most recent', () => {
    const storage = createStorage()
    const validIds = ['a', 'b', 'c', 'd', 'e', 'f']
    expect(saveRecentlyViewed(['a', 'b', 'a', 'unknown', 'c', 'd', 'e', 'f'], validIds, storage)).toBe(true)
    expect(storage.values.get(RECENTLY_VIEWED_STORAGE_KEY)).toBe('["a","b","c","d","e"]')
    expect(loadRecentlyViewed(validIds, storage).schemeIds).toEqual(['a', 'b', 'c', 'd', 'e'])
  })

  it('reports unavailable storage without throwing', () => {
    const unavailable = {
      getItem: () => { throw new Error('Storage unavailable') },
      setItem: () => { throw new Error('Storage unavailable') },
    }

    expect(loadRecentlyViewed(['a'], unavailable).persistenceAvailable).toBe(false)
    expect(saveRecentlyViewed(['a'], ['a'], unavailable)).toBe(false)
  })
})
