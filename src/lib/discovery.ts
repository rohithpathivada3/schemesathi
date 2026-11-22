import { discoveryDomains, type DiscoveryDomainId } from './domainMatching'

export type LiveApplicationStatus =
  | 'new'
  | 'active'
  | 'upcoming'
  | 'closing_soon'
  | 'closed'
  | 'verification_required'

export type LiveOpportunity = {
  id: string
  title: string
  organizationName: string
  sector: 'government' | 'private'
  domainIds: DiscoveryDomainId[]
  description: string
  benefits: string[]
  eligibility: string[]
  requiredDocuments: string[]
  sourceUrl: string
  sourcePublishedAt: string
  applicationUrl: string | null
  applicationStartDate: string | null
  applicationDeadline: string | null
  applicationStatus: LiveApplicationStatus
  lastVerifiedAt: string
}

const domainIds = new Set<string>(discoveryDomains.map((domain) => domain.id))
const applicationStatuses = new Set<string>([
  'new', 'active', 'upcoming', 'closing_soon', 'closed', 'verification_required',
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function isDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}

function isOptionalDate(value: unknown): value is string | null {
  return value === null || isDate(value)
}

function isSecureUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false
  try {
    const url = new URL(value)
    return url.protocol === 'https:' &&
      (!url.port || url.port === '443') &&
      !url.username &&
      !url.password &&
      !url.hash
  } catch {
    return false
  }
}

function isLiveOpportunity(value: unknown): value is LiveOpportunity {
  if (!isRecord(value)) return false
  return typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.organizationName === 'string' &&
    (value.sector === 'government' || value.sector === 'private') &&
    Array.isArray(value.domainIds) &&
    value.domainIds.length > 0 &&
    value.domainIds.every((id) => typeof id === 'string' && domainIds.has(id)) &&
    typeof value.description === 'string' &&
    isStringArray(value.benefits) &&
    isStringArray(value.eligibility) &&
    isStringArray(value.requiredDocuments) &&
    isSecureUrl(value.sourceUrl) &&
    isDate(value.sourcePublishedAt) &&
    (value.applicationUrl === null || isSecureUrl(value.applicationUrl)) &&
    isOptionalDate(value.applicationStartDate) &&
    isOptionalDate(value.applicationDeadline) &&
    typeof value.applicationStatus === 'string' &&
    applicationStatuses.has(value.applicationStatus) &&
    typeof value.lastVerifiedAt === 'string' &&
    Number.isFinite(Date.parse(value.lastVerifiedAt))
}

export async function getLiveOpportunities(
  selectedDomains: DiscoveryDomainId[],
  fetchImpl: typeof fetch = fetch
): Promise<LiveOpportunity[]> {
  const query = new URLSearchParams()
  if (selectedDomains.length > 0) query.set('domains', selectedDomains.join(','))
  const suffix = query.size > 0 ? `?${query.toString()}` : ''
  const response = await fetchImpl(`/api/discovery/opportunities${suffix}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(10000),
  })

  if (!response.ok) {
    throw new Error(response.status === 503 ? 'not-configured' : 'request-failed')
  }
  if (!response.headers.get('content-type')?.toLowerCase().includes('application/json')) {
    throw new Error('not-configured')
  }

  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    throw new Error('invalid-response')
  }
  if (!isRecord(payload) || !Array.isArray(payload.opportunities) ||
      !payload.opportunities.every(isLiveOpportunity)) {
    throw new Error('invalid-response')
  }
  return payload.opportunities
}
