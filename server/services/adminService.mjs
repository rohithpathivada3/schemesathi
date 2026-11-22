import { assessCandidate } from './schemeVerification.mjs'
import { createSupabaseSchemeRepository } from './supabaseSchemeRepository.mjs'
import { supabaseRest } from '../lib/supabaseRest.mjs'
import { AdminHttpError } from '../lib/adminHttp.mjs'

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const parserFieldNames = new Set([
  'title', 'description', 'source_url', 'source_identifier', 'published_at',
  'application_url', 'application_start_date', 'application_deadline',
  'application_status', 'benefits', 'eligibility', 'required_documents',
  'government_level', 'state',
])
const blockedApiKeyHeaders = new Set([
  'connection', 'content-length', 'cookie', 'host', 'origin',
  'proxy-authorization', 'transfer-encoding',
])

function requiredText(value, field, maxLength = 200) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > maxLength) {
    throw new AdminHttpError(400, `invalid_${field}`)
  }
  return value.trim()
}

function normalizeDomain(value, field) {
  const domain = requiredText(value, field, 253).toLowerCase().replace(/\.$/, '')
  let url
  try {
    url = new URL(`https://${domain}`)
  } catch {
    throw new AdminHttpError(400, `invalid_${field}`)
  }
  if (
    url.hostname !== domain ||
    !domain.includes('.') ||
    domain === 'localhost' ||
    /^(\d{1,3}\.){3}\d{1,3}$/.test(domain) ||
    domain.includes(':')
  ) {
    throw new AdminHttpError(400, `invalid_${field}`)
  }
  return domain
}

function isWithinDomain(hostname, domain) {
  const host = hostname.toLowerCase().replace(/\.$/, '')
  return host === domain || host.endsWith(`.${domain}`)
}

function secureUrl(value, field, domain) {
  const rawUrl = requiredText(value, field, 2048)
  let url
  try {
    url = new URL(rawUrl)
  } catch {
    throw new AdminHttpError(400, `invalid_${field}`)
  }
  if (
    url.protocol !== 'https:' ||
    (url.port && url.port !== '443') ||
    url.username ||
    url.password ||
    url.hash ||
    !isWithinDomain(url.hostname, domain)
  ) {
    throw new AdminHttpError(400, `invalid_${field}`)
  }
  return url.href
}

function asObject(value, field) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new AdminHttpError(400, `invalid_${field}`)
  }
  return value
}

function validateParserConfig(value) {
  const config = asObject(value ?? {}, 'parser_config')
  if (config.items_path !== undefined &&
    (typeof config.items_path !== 'string' ||
      config.items_path.length > 256 ||
      !/^[A-Za-z0-9_$@#-]+(?:\.[A-Za-z0-9_$@#-]+)*$/.test(config.items_path))) {
    throw new AdminHttpError(400, 'invalid_parser_config')
  }
  if (config.fields !== undefined) {
    const fields = asObject(config.fields, 'parser_config')
    for (const [field, path] of Object.entries(fields)) {
      if (!parserFieldNames.has(field) || typeof path !== 'string' ||
        path.length > 256 ||
        !/^[A-Za-z0-9_$@#-]+(?:\.[A-Za-z0-9_$@#-]+)*$/.test(path)) {
        throw new AdminHttpError(400, 'invalid_parser_config')
      }
    }
  }
  if (Object.keys(config).some((key) => key !== 'items_path' && key !== 'fields')) {
    throw new AdminHttpError(400, 'invalid_parser_config')
  }
  return config
}

function positiveInteger(value, field, minimum, maximum, fallback) {
  if (value === undefined || value === null || value === '') return fallback
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new AdminHttpError(400, `invalid_${field}`)
  }
  return parsed
}

function requireUuid(value, field) {
  const id = requiredText(value, field, 36)
  if (!uuidPattern.test(id)) throw new AdminHttpError(400, `invalid_${field}`)
  return id
}

async function getRow(table, id, select = '*') {
  const rows = await supabaseRest(table, { select, id: `eq.${id}`, limit: '1' })
  return Array.isArray(rows) ? rows[0] ?? null : null
}

async function activeCategories() {
  const rows = await supabaseRest('ss_scheme_categories', {
    select: 'id',
    is_active: 'eq.true',
    limit: '100',
  })
  return new Set((Array.isArray(rows) ? rows : []).map((row) => row.id))
}

async function createOrganization(input) {
  const name = requiredText(input.name, 'name', 160)
  const sector = input.sector
  if (!['government', 'private'].includes(sector)) {
    throw new AdminHttpError(400, 'invalid_sector')
  }
  const officialDomain = normalizeDomain(input.officialDomain, 'official_domain')
  const websiteUrl = secureUrl(input.websiteUrl, 'website_url', officialDomain)
  const rows = await supabaseRest('ss_organizations', {}, {
    method: 'POST',
    body: {
      name,
      sector,
      official_domain: officialDomain,
      website_url: websiteUrl,
      verified_at: null,
    },
    prefer: 'return=representation',
  })
  const organization = Array.isArray(rows) ? rows[0] : null
  if (!organization?.id) throw new Error('Supabase did not return the organization')
  return { organization }
}

async function verifyOrganization(input) {
  if (input.confirmOfficial !== true) throw new AdminHttpError(400, 'official_verification_required')
  const id = requireUuid(input.id, 'organization_id')
  const organization = await getRow(
    'ss_organizations',
    id,
    'id,name,sector,website_url,official_domain,verified_at',
  )
  if (!organization) throw new AdminHttpError(404, 'organization_not_found')
  const domain = normalizeDomain(organization.official_domain, 'official_domain')
  secureUrl(organization.website_url, 'website_url', domain)
  const verifiedAt = new Date().toISOString()
  await supabaseRest('ss_organizations', { id: `eq.${id}` }, {
    method: 'PATCH',
    body: { official_domain: domain, verified_at: verifiedAt, updated_at: verifiedAt },
    prefer: 'return=minimal',
  })
  return { organizationId: id, verifiedAt }
}

async function createSource(input) {
  const organizationId = requireUuid(input.organizationId, 'organization_id')
  const organization = await getRow(
    'ss_organizations',
    organizationId,
    'id,official_domain,verified_at',
  )
  if (!organization) throw new AdminHttpError(404, 'organization_not_found')
  const officialDomain = normalizeDomain(organization.official_domain, 'official_domain')
  const authorizedDomain = normalizeDomain(input.authorizedDomain, 'authorized_domain')
  if (!isWithinDomain(authorizedDomain, officialDomain)) {
    throw new AdminHttpError(400, 'source_domain_mismatch')
  }
  const sourceUrl = secureUrl(input.sourceUrl, 'source_url', authorizedDomain)
  const sourceType = input.sourceType
  if (sourceType !== 'api' && sourceType !== 'rss') {
    throw new AdminHttpError(400, 'invalid_source_type')
  }
  const name = requiredText(input.name, 'name', 160)
  if (!Array.isArray(input.domainIds) || input.domainIds.length === 0 || input.domainIds.length > 12 ||
    input.domainIds.some((id) => typeof id !== 'string')) {
    throw new AdminHttpError(400, 'invalid_domain_ids')
  }
  const domainIds = [...new Set(input.domainIds)]
  const allowedCategories = await activeCategories()
  if (domainIds.some((id) => !allowedCategories.has(id))) {
    throw new AdminHttpError(400, 'invalid_domain_ids')
  }
  const parserConfig = validateParserConfig(input.parserConfig ?? {})
  const apiKeyEnvVar = input.apiKeyEnvVar
    ? requiredText(input.apiKeyEnvVar, 'api_key_env_var', 100)
    : null
  if (apiKeyEnvVar && !/^SOURCE_API_KEY_[A-Z0-9_]+$/.test(apiKeyEnvVar)) {
    throw new AdminHttpError(400, 'invalid_api_key_env_var')
  }
  const apiKeyHeader = input.apiKeyHeader
    ? requiredText(input.apiKeyHeader, 'api_key_header', 80)
    : 'x-api-key'
  if (!/^[a-zA-Z0-9-]+$/.test(apiKeyHeader) ||
    blockedApiKeyHeaders.has(apiKeyHeader.toLowerCase())) {
    throw new AdminHttpError(400, 'invalid_api_key_header')
  }

  const rows = await supabaseRest('ss_information_sources', {}, {
    method: 'POST',
    body: {
      organization_id: organizationId,
      name,
      source_url: sourceUrl,
      source_type: sourceType,
      authorized_domain: authorizedDomain,
      domain_ids: domainIds,
      parser_config: parserConfig,
      api_key_env_var: apiKeyEnvVar,
      api_key_header: apiKeyHeader,
      trust_status: 'pending',
      is_enabled: false,
      refresh_interval_minutes: positiveInteger(input.refreshIntervalMinutes, 'refresh_interval', 15, 43200, 1440),
      max_requests_per_hour: positiveInteger(input.maxRequestsPerHour, 'max_requests_per_hour', 1, 60, 4),
    },
    prefer: 'return=representation',
  })
  const source = Array.isArray(rows) ? rows[0] : null
  if (!source?.id) throw new Error('Supabase did not return the source')
  return { source }
}

async function setSourceState(input) {
  const id = requireUuid(input.id, 'source_id')
  const action = input.action
  if (action === 'source.disable') {
    if (!await getRow('ss_information_sources', id, 'id')) {
      throw new AdminHttpError(404, 'source_not_found')
    }
    await supabaseRest('ss_information_sources', { id: `eq.${id}` }, {
      method: 'PATCH',
      body: { is_enabled: false, updated_at: new Date().toISOString() },
      prefer: 'return=minimal',
    })
    return { sourceId: id, isEnabled: false }
  }

  if (action === 'source.reject') {
    if (!await getRow('ss_information_sources', id, 'id')) {
      throw new AdminHttpError(404, 'source_not_found')
    }
    await supabaseRest('ss_information_sources', { id: `eq.${id}` }, {
      method: 'PATCH',
      body: { trust_status: 'rejected', is_enabled: false, updated_at: new Date().toISOString() },
      prefer: 'return=minimal',
    })
    return { sourceId: id, trustStatus: 'rejected', isEnabled: false }
  }

  if (action !== 'source.verify') throw new AdminHttpError(400, 'invalid_action')
  const source = await getRow(
    'ss_information_sources',
    id,
    'id,organization_id,source_url,source_type,authorized_domain,domain_ids,parser_config,api_key_env_var,api_key_header',
  )
  if (!source) throw new AdminHttpError(404, 'source_not_found')
  const organization = await getRow(
    'ss_organizations',
    source.organization_id,
    'id,sector,official_domain,verified_at',
  )
  if (input.confirmOfficial !== true) throw new AdminHttpError(400, 'official_verification_required')
  if (!organization?.verified_at ||
    !['government', 'private'].includes(organization.sector) ||
    !Number.isFinite(Date.parse(organization.verified_at))) {
    throw new AdminHttpError(400, 'organization_not_verified')
  }
  const officialDomain = normalizeDomain(organization.official_domain, 'official_domain')
  const authorizedDomain = normalizeDomain(source.authorized_domain, 'authorized_domain')
  if (!isWithinDomain(authorizedDomain, officialDomain)) {
    throw new AdminHttpError(400, 'source_domain_mismatch')
  }
  secureUrl(source.source_url, 'source_url', authorizedDomain)
  if (!['api', 'rss'].includes(source.source_type)) {
    throw new AdminHttpError(400, 'invalid_source_type')
  }
  validateParserConfig(source.parser_config ?? {})
  if (source.api_key_env_var &&
    !/^SOURCE_API_KEY_[A-Z0-9_]+$/.test(source.api_key_env_var)) {
    throw new AdminHttpError(400, 'invalid_api_key_env_var')
  }
  if (
    !/^[a-zA-Z0-9-]+$/.test(source.api_key_header ?? '') ||
    blockedApiKeyHeaders.has(source.api_key_header.toLowerCase())
  ) {
    throw new AdminHttpError(400, 'invalid_api_key_header')
  }
  if (!Array.isArray(source.domain_ids) || source.domain_ids.length === 0) {
    throw new AdminHttpError(400, 'invalid_domain_ids')
  }
  const allowedCategories = await activeCategories()
  if (source.domain_ids.some((domainId) => !allowedCategories.has(domainId))) {
    throw new AdminHttpError(400, 'invalid_domain_ids')
  }
  await supabaseRest('ss_information_sources', { id: `eq.${id}` }, {
    method: 'PATCH',
    body: {
      trust_status: 'verified',
      is_enabled: true,
      updated_at: new Date().toISOString(),
    },
    prefer: 'return=minimal',
  })
  return { sourceId: id, trustStatus: 'verified', isEnabled: true }
}

function candidateFromStored(record, sourceId) {
  return {
    sourceId: record.source_id ?? sourceId,
    organizationId: record.organization_id,
    sourceIdentifier: record.source_identifier,
    title: record.title,
    description: record.description,
    sourceUrl: record.source_url,
    sourcePublishedAt: record.source_published_at,
    applicationUrl: record.application_url,
    applicationStartDate: record.application_start_date,
    applicationDeadline: record.application_deadline,
    applicationStatus: record.application_status,
    benefits: record.benefits,
    eligibility: record.eligibility,
    requiredDocuments: record.required_documents,
    governmentLevel: record.government_level,
    state: record.state,
  }
}

async function resolveReview(reviewId) {
  const review = await getRow(
    'ss_administrator_reviews',
    reviewId,
    'id,scheme_id,status',
  )
  if (!review) throw new AdminHttpError(404, 'review_not_found')
  if (review.status !== 'pending') throw new AdminHttpError(409, 'review_already_resolved')
  const scheme = await getRow('ss_schemes', review.scheme_id, '*')
  if (!scheme) throw new AdminHttpError(404, 'scheme_not_found')
  const updates = await supabaseRest('ss_scheme_updates', {
    select: 'id,observed_data,review_status',
    scheme_id: `eq.${scheme.id}`,
    review_status: 'in.(pending,conflict)',
    order: 'observed_at.desc',
    limit: '1',
  })
  const update = Array.isArray(updates) ? updates[0] ?? null : null
  return { review, scheme, update }
}

async function decideReview(input) {
  if (input.decision === 'approve' && input.confirmOfficial !== true) {
    throw new AdminHttpError(400, 'official_verification_required')
  }
  const reviewId = requireUuid(input.reviewId, 'review_id')
  const decision = input.decision
  if (decision !== 'approve' && decision !== 'reject') {
    throw new AdminHttpError(400, 'invalid_decision')
  }
  const { review, scheme, update } = await resolveReview(reviewId)
  const now = new Date().toISOString()

  if (decision === 'reject') {
    await repository.recordNewSchemeNotification(scheme.id, assessment.categoryIds, {
      title: assessment.scheme.title,
      sourceUrl: assessment.scheme.source_url,
    })
    if (update) {
      await supabaseRest('ss_scheme_updates', {
        scheme_id: `eq.${scheme.id}`,
        review_status: 'in.(pending,conflict)',
      }, {
        method: 'PATCH',
        body: { review_status: 'rejected' },
        prefer: 'return=minimal',
      })
    } else if (!scheme.is_published) {
      await supabaseRest('ss_schemes', { id: `eq.${scheme.id}` }, {
        method: 'PATCH',
        body: { verification_status: 'rejected', is_published: false, updated_at: now },
        prefer: 'return=minimal',
      })
    }
    await supabaseRest('ss_administrator_reviews', { id: `eq.${review.id}` }, {
      method: 'PATCH',
      body: { status: 'rejected', reviewer_reference: 'admin', reviewed_at: now, updated_at: now },
      prefer: 'return=minimal',
    })
    return { reviewId: review.id, status: 'rejected' }
  }

  const storedRecord = update?.observed_data ?? scheme
  const candidate = candidateFromStored(storedRecord, scheme.source_id)
  const repository = createSupabaseSchemeRepository()
  const context = await repository.getContext(candidate.sourceId)
  const assessment = assessCandidate(candidate, context, new Date(now))
  if (assessment.verificationStatus !== 'verified') {
    throw new AdminHttpError(422, 'review_requires_verification', assessment.reasons)
  }

  await supabaseRest('ss_scheme_category_links', { on_conflict: 'scheme_id,category_id' }, {
    method: 'POST',
    body: assessment.categoryIds.map((categoryId) => ({
      scheme_id: scheme.id,
      category_id: categoryId,
    })),
    prefer: 'resolution=ignore-duplicates,return=minimal',
  })
  await supabaseRest('ss_schemes', { id: `eq.${scheme.id}` }, {
    method: 'PATCH',
    body: {
      ...assessment.scheme,
      application_status: assessment.applicationStatus,
      verification_status: 'verified',
      last_verified_at: now,
      is_published: true,
      published_at: scheme.published_at ?? now,
      updated_at: now,
    },
    prefer: 'return=minimal',
  })
  if (update) {
    await supabaseRest('ss_scheme_updates', {
      scheme_id: `eq.${scheme.id}`,
      review_status: 'in.(pending,conflict)',
    }, {
      method: 'PATCH',
      body: { review_status: 'approved' },
      prefer: 'return=minimal',
    })
  }
  await supabaseRest('ss_administrator_reviews', { id: `eq.${review.id}` }, {
    method: 'PATCH',
    body: { status: 'approved', reviewer_reference: 'admin', reviewed_at: now, updated_at: now },
    prefer: 'return=minimal',
  })
  return { reviewId: review.id, schemeId: scheme.id, status: 'approved' }
}

export async function executeAdminAction(input) {
  const action = requiredText(input?.action, 'action', 50)
  switch (action) {
    case 'organization.create':
      return createOrganization(input)
    case 'organization.verify':
      return verifyOrganization(input)
    case 'source.create':
      return createSource(input)
    case 'source.verify':
    case 'source.disable':
    case 'source.reject':
      return setSourceState(input)
    case 'review.approve':
    case 'review.reject':
      return decideReview(input)
    default:
      throw new AdminHttpError(400, 'invalid_action')
  }
}
