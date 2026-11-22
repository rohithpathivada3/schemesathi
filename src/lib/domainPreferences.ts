import { discoveryDomains, type DiscoveryDomainId } from './domainMatching'

export const DOMAIN_PREFERENCES_STORAGE_KEY = 'schemesathi_domain_preferences_v1'

type PreferenceStorage = Pick<Storage, 'getItem' | 'setItem'>

export type DomainPreferenceState = {
  selectedDomainIds: DiscoveryDomainId[]
  persistenceAvailable: boolean
}

const knownDomainIds = new Set<string>(discoveryDomains.map((domain) => domain.id))

function validDomainIds(value: unknown): DiscoveryDomainId[] {
  if (!Array.isArray(value)) return []
  return [...new Set(value.filter((id): id is DiscoveryDomainId =>
    typeof id === 'string' && knownDomainIds.has(id)
  ))]
}

export function loadDomainPreferences(
  storage?: PreferenceStorage
): DomainPreferenceState {
  try {
    const stored = (storage ?? window.localStorage).getItem(DOMAIN_PREFERENCES_STORAGE_KEY)
    if (stored === null) {
      return { selectedDomainIds: [], persistenceAvailable: true }
    }

    const parsed: unknown = JSON.parse(stored)
    if (!Array.isArray(parsed)) {
      return { selectedDomainIds: [], persistenceAvailable: false }
    }
    return { selectedDomainIds: validDomainIds(parsed), persistenceAvailable: true }
  } catch {
    return { selectedDomainIds: [], persistenceAvailable: false }
  }
}

export function saveDomainPreferences(
  selectedDomainIds: readonly string[],
  storage?: PreferenceStorage
): boolean {
  try {
    const preferenceStorage = storage ?? window.localStorage
    preferenceStorage.setItem(
      DOMAIN_PREFERENCES_STORAGE_KEY,
      JSON.stringify(validDomainIds(selectedDomainIds))
    )
    return true
  } catch {
    return false
  }
}
