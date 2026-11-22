import { supabaseRest } from '../../server/lib/supabaseRest.mjs'

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function json(res, status, value, headers = {}) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  for (const [name, headerValue] of Object.entries(headers)) {
    res.setHeader(name, headerValue)
  }
  res.end(JSON.stringify(value))
}

function isDate(value) {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}

function isSecureUrl(value) {
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

function isOfficialUrl(value, officialDomain) {
  if (!isSecureUrl(value) || typeof officialDomain !== 'string') return false
  const hostname = new URL(value).hostname.toLowerCase().replace(/\.$/, '')
  const domain = officialDomain.toLowerCase().replace(/\.$/, '')
  return hostname === domain || hostname.endsWith(`.${domain}`)
}

function stringList(value) {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
    ? value
    : null
}

function relatedOrganization(value) {
  return Array.isArray(value) ? value[0] : value
}

export function toPublicOpportunity(row, validDomainIds) {
  const organization = relatedOrganization(row.organization)
  const domainIds = [...new Set((row.domain_links ?? [])
    .map((link) => link.category_id)
    .filter((id) => validDomainIds.has(id)))]
  const benefits = stringList(row.benefits)
  const eligibility = stringList(row.eligibility)
  const requiredDocuments = stringList(row.required_documents)
  const optionalDate = (value) => value === null || isDate(value)

  if (
    !row.id ||
    typeof row.title !== 'string' ||
    !organization ||
    typeof organization.name !== 'string' ||
    !['government', 'private'].includes(row.sector) ||
    domainIds.length === 0 ||
    typeof row.description !== 'string' ||
    !benefits ||
    !eligibility ||
    !requiredDocuments ||
    !isOfficialUrl(row.source_url, organization.official_domain) ||
    !isDate(row.source_published_at) ||
    !(row.application_url === null || isOfficialUrl(row.application_url, organization.official_domain)) ||
    !optionalDate(row.application_start_date) ||
    !optionalDate(row.application_deadline) ||
    !['new', 'active', 'upcoming', 'closing_soon', 'closed', 'verification_required']
      .includes(row.application_status) ||
    !Number.isFinite(Date.parse(row.last_verified_at))
  ) {
    return null
  }

  return {
    id: row.id,
    title: row.title,
    organizationName: organization.name,
    sector: row.sector,
    domainIds,
    description: row.description,
    benefits,
    eligibility,
    requiredDocuments,
    sourceUrl: row.source_url,
    sourcePublishedAt: row.source_published_at,
    applicationUrl: row.application_url,
    applicationStartDate: row.application_start_date,
    applicationDeadline: row.application_deadline,
    applicationStatus: row.application_status,
    lastVerifiedAt: row.last_verified_at,
  }
}

export async function listPublicOpportunities(selectedDomains) {
  const categories = await supabaseRest('ss_scheme_categories', {
    select: 'id',
    is_active: 'eq.true',
    limit: '100',
  })
  const validDomainIds = new Set((Array.isArray(categories) ? categories : [])
    .map((category) => category.id))
  if (selectedDomains.some((id) => !validDomainIds.has(id))) {
    return { invalidDomains: true, opportunities: [] }
  }

  const query = {
    select: [
      'id', 'title', 'sector', 'description', 'benefits', 'eligibility',
      'required_documents', 'source_url', 'source_published_at', 'application_url',
      'application_start_date', 'application_deadline', 'application_status',
      'last_verified_at', 'organization:ss_organizations!inner(name,official_domain)',
      'domain_links:ss_scheme_category_links!inner(category_id)',
    ].join(','),
    is_published: 'eq.true',
    verification_status: 'eq.verified',
    last_verified_at: 'not.is.null',
    order: 'source_published_at.desc',
    limit: '200',
  }
  if (selectedDomains.length > 0) {
    query['domain_links.category_id'] = `in.(${selectedDomains.join(',')})`
  }
  const rows = await supabaseRest('ss_schemes', query)
  const opportunities = (Array.isArray(rows) ? rows : [])
    .map((row) => toPublicOpportunity(row, validDomainIds))
    .filter(Boolean)

  return { invalidDomains: false, opportunities }
}

export function createDiscoveryHandler(loadOpportunities = listPublicOpportunities) {
  return async function discoveryHandler(req, res) {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET')
      return json(res, 405, { error: 'method_not_allowed' })
    }

    const url = new URL(req.url ?? '/', 'https://schemesathi.invalid')
    const rawDomains = url.searchParams.get('domains')
    const selectedDomains = rawDomains
      ? [...new Set(rawDomains.split(',').filter(Boolean))]
      : []
    if (selectedDomains.length > 12 || selectedDomains.some((id) => !/^[a-z0-9-]+$/.test(id))) {
      return json(res, 400, { error: 'invalid_domains' })
    }

    try {
      const result = await loadOpportunities(selectedDomains)
      if (result.invalidDomains) {
        return json(res, 400, { error: 'invalid_domains' })
      }
      return json(res, 200, { opportunities: result.opportunities }, {
        'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=300',
      })
    } catch (error) {
      if (error instanceof Error &&
        error.message.includes('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')) {
        return json(res, 503, { error: 'discovery_not_configured' })
      }
      console.error('Public discovery request failed')
      return json(res, 500, { error: 'discovery_unavailable' })
    }
  }
}

export default createDiscoveryHandler()
