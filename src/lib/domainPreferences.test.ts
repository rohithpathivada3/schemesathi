import { describe, expect, it } from 'vitest'
import { DOMAIN_PREFERENCES_STORAGE_KEY, loadDomainPreferences, saveDomainPreferences } from './domainPreferences'

function createStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial))
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    values,
  }
}

describe('domain preferences', () => {
  it('stores only recognized domain IDs locally and restores them', () => {
    const storage = createStorage()
    const saved = saveDomainPreferences([
      'agriculture-farmers',
      'agriculture-farmers',
      'unknown-domain',
    ], storage)

    expect(saved).toBe(true)
    expect(storage.values.get(DOMAIN_PREFERENCES_STORAGE_KEY)).toBe('["agriculture-farmers"]')
    expect(loadDomainPreferences(storage)).toEqual({
      selectedDomainIds: ['agriculture-farmers'],
      persistenceAvailable: true,
    })
  })

  it('returns all domains for missing preferences and reports corrupt storage', () => {
    expect(loadDomainPreferences(createStorage()).selectedDomainIds).toEqual([])
    expect(loadDomainPreferences(createStorage({
      [DOMAIN_PREFERENCES_STORAGE_KEY]: '{invalid',
    })).persistenceAvailable).toBe(false)
  })

  it('keeps preferences in the current page when browser storage is unavailable', () => {
    const unavailable = {
      getItem: () => { throw new Error('Storage unavailable') },
      setItem: () => { throw new Error('Storage unavailable') },
    }

    expect(loadDomainPreferences(unavailable).persistenceAvailable).toBe(false)
    expect(saveDomainPreferences(['health-medical'], unavailable)).toBe(false)
  })
})
