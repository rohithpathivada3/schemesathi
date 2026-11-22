import { createHash } from 'node:crypto'

const REQUIRED_LISTS = [
  ['benefits', 'benefits_missing'],
  ['eligibility', 'eligibility_missing'],
  ['requiredDocuments', 'required_documents_missing'],
]

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeList(value) {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => typeof item === 'string' ? item.trim() : '')
    .filter(Boolean)
}

function isValidDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

function normalizeDate(value, allowPublishedTimestamp = false) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (isValidDate(trimmed)) return trimmed
  if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) {
    if (!isValidDate(trimmed.slice(0, 10))) return null
    const parsed = new Date(trimmed)
    if (Number.isFinite(parsed.getTime())) return parsed.toISOString().slice(0, 10)
  }
  if (
    allowPublishedTimestamp &&
    /(?:GMT|UTC|[+-]\d{4})$/i.test(trimmed)
  ) {
    const parsed = new Date(trimmed)
    if (Number.isFinite(parsed.getTime())) return parsed.toISOString().slice(0, 10)
  }
  return null
}

function validDomainUrl(value, domain) {
  if (typeof value !== 'string') return false
  try {
    const url = new URL(value)
    const hostname = url.hostname.toLowerCase()
    const allowedDomain = String(domain ?? '').toLowerCase()
    const publicHostname = hostname !== 'localhost' &&
      !hostname.endsWith('.localhost') &&
      !hostname.endsWith('.local') &&
      !hostname.endsWith('.internal') &&
      !/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname) &&
      !hostname.includes(':')
    return url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      !url.hash &&
      (!url.port || url.port === '443') &&
      publicHostname &&
      (hostname === allowedDomain || hostname.endsWith(`.${allowedDomain}`))
  } catch {
    return false
  }
}

function normalizeStatus(value) {
  const normalized = normalizeText(value).toLowerCase().replace(/[\s-]+/g, '_')
  const aliases = {
    open: 'active',
    accepting_applications: 'active',
    application_open: 'active',
    not_yet_open: 'upcoming',
    expired: 'closed',
  }
  const status = aliases[normalized] ?? normalized
  return ['new', 'active', 'upcoming', 'closing_soon', 'closed'].includes(status)
    ? status
    : null
}

function determineApplicationStatus({ explicit, startDate, deadline, publishedDate, today }) {
  if (startDate && deadline && startDate > deadline) {
    return { status: 'verification_required', conflict: true }
  }

  if (deadline && deadline < today) {
    if (explicit && !['closed', 'new'].includes(explicit)) {
      return { status: 'verification_required', conflict: true }
    }
    return { status: 'closed', conflict: false }
  }

  if (startDate && startDate > today) {
    if (explicit && !['upcoming', 'new'].includes(explicit)) {
      return { status: 'verification_required', conflict: true }
    }
    return { status: 'upcoming', conflict: false }
  }

  if (startDate && deadline && startDate <= today && deadline >= today) {
    const daysUntilDeadline = (Date.parse(`${deadline}T00:00:00.000Z`) -
      Date.parse(`${today}T00:00:00.000Z`)) / 86_400_000
    const dateStatus = daysUntilDeadline <= 7 ? 'closing_soon' : 'active'
    if (explicit && ['closed', 'upcoming'].includes(explicit)) {
      return { status: 'verification_required', conflict: true }
    }
    return { status: dateStatus, conflict: false }
  }

  if (explicit) {
    if (explicit === 'active' && startDate && startDate > today) {
      return { status: 'verification_required', conflict: true }
    }
    return { status: explicit, conflict: false }
  }

  if (publishedDate) {
    const ageDays = (Date.parse(`${today}T00:00:00.000Z`) -
      Date.parse(`${publishedDate}T00:00:00.000Z`)) / 86_400_000
    if (ageDays >= 0 && ageDays <= 14) {
      return { status: 'new', conflict: false }
    }
  }

  return { status: 'verification_required', conflict: false }
}

function identityKey(title, officialDomain) {
  const normalizedTitle = title.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
  const normalizedDomain = officialDomain.toLowerCase().replace(/\.$/, '')
  return createHash('sha256').update(`${normalizedDomain}\n${normalizedTitle}`).digest('hex')
}

function isValidTimestamp(value) {
  return typeof value === 'string' && Number.isFinite(Date.parse(value))
}

export function assessCandidate(candidate, context, now = new Date()) {
  const reasons = []
  const source = context?.source
  const organization = context?.organization
  const title = normalizeText(candidate?.title)
  const description = normalizeText(candidate?.description)
  const sourceUrl = normalizeText(candidate?.sourceUrl)
  const officialDomain = normalizeText(organization?.official_domain).toLowerCase()

  if (!source || source.trust_status !== 'verified' || source.is_enabled !== true) {
    reasons.push('source_not_verified')
  }
  if (
    !organization ||
    organization.id !== source?.organization_id ||
    !['government', 'private'].includes(organization.sector) ||
    !isValidTimestamp(organization.verified_at)
  ) {
    reasons.push('organization_not_verified')
  }
  if (!officialDomain || !validDomainUrl(sourceUrl, source?.authorized_domain)) {
    reasons.push('source_url_not_authorized')
  }
  if (
    officialDomain &&
    source?.authorized_domain &&
    source.authorized_domain.toLowerCase() !== officialDomain &&
    !source.authorized_domain.toLowerCase().endsWith(`.${officialDomain}`)
  ) {
    reasons.push('source_domain_mismatch')
  }
  if (!title) reasons.push('title_missing')
  if (!description) reasons.push('description_missing')

  const publishedDate = normalizeDate(candidate?.sourcePublishedAt, true)
  const startDate = candidate?.applicationStartDate
    ? normalizeDate(candidate.applicationStartDate)
    : null
  const deadline = candidate?.applicationDeadline
    ? normalizeDate(candidate.applicationDeadline)
    : null
  if (!publishedDate) reasons.push('publication_date_missing_or_invalid')
  if (candidate?.applicationStartDate && !startDate) reasons.push('application_start_date_invalid')
  if (candidate?.applicationDeadline && !deadline) reasons.push('application_deadline_invalid')

  const allowedCategories = new Set(context?.categoryIds ?? [])
  const domainIds = Array.isArray(source?.domain_ids) ? source.domain_ids : []
  const categoryIds = [...new Set(domainIds.filter((id) => allowedCategories.has(id)))]
  if (categoryIds.length === 0 || categoryIds.length !== new Set(domainIds).size) {
    reasons.push('domain_categories_unverified')
  }

  const benefits = normalizeList(candidate?.benefits)
  const eligibility = normalizeList(candidate?.eligibility)
  const requiredDocuments = normalizeList(candidate?.requiredDocuments)
  for (const [field, reason] of REQUIRED_LISTS) {
    if (normalizeList(candidate?.[field]).length === 0) reasons.push(reason)
  }

  const applicationUrl = normalizeText(candidate?.applicationUrl)
  let verifiedApplicationUrl = null
  if (applicationUrl) {
    if (validDomainUrl(applicationUrl, officialDomain)) {
      verifiedApplicationUrl = applicationUrl
    } else {
      reasons.push('application_url_not_verified')
    }
  }

  const today = now.toISOString().slice(0, 10)
  if (publishedDate && publishedDate > today) {
    reasons.push('publication_date_in_future')
  }
  const explicitStatus = normalizeStatus(candidate?.applicationStatus)
  if (candidate?.applicationStatus && !explicitStatus) {
    reasons.push('application_status_unrecognized')
  }
  const statusResult = determineApplicationStatus({
    explicit: explicitStatus,
    startDate,
    deadline,
    publishedDate,
    today,
  })
  if (statusResult.conflict) reasons.push('application_dates_conflict')
  if (statusResult.status === 'verification_required') {
    reasons.push('application_status_uncertain')
  }

  const conflict = reasons.includes('source_domain_mismatch') ||
    reasons.includes('publication_date_in_future') ||
    reasons.includes('application_dates_conflict')
  const verificationStatus = conflict ? 'conflict' : reasons.length === 0 ? 'verified' : 'pending'
  const applicationStatus = verificationStatus === 'verified'
    ? statusResult.status
    : 'verification_required'
  const persistable = Boolean(source?.id && organization?.id && title && sourceUrl)
  const verifiedAt = verificationStatus === 'verified' ? now.toISOString() : null

  return {
    persistable,
    verificationStatus,
    applicationStatus,
    reasons: [...new Set(reasons)],
    categoryIds,
    dedupeKey: persistable ? identityKey(title, officialDomain) : null,
    scheme: persistable ? {
      source_id: source.id,
      organization_id: organization.id,
      source_identifier: normalizeText(candidate?.sourceIdentifier) || null,
      title,
      sector: organization.sector,
      government_level: normalizeText(candidate?.governmentLevel) || null,
      state: normalizeText(candidate?.state) || null,
      description,
      benefits,
      eligibility,
      required_documents: requiredDocuments,
      application_url: verifiedApplicationUrl,
      source_url: sourceUrl,
      source_published_at: publishedDate,
      application_start_date: startDate,
      application_deadline: deadline,
      application_status: applicationStatus,
      verification_status: verificationStatus,
      last_verified_at: verifiedAt,
      is_published: false,
      dedupe_key: identityKey(title, officialDomain),
    } : null,
  }
}

const comparisonFields = [
  ['title', 'title'],
  ['description', 'description'],
  ['benefits', 'benefits'],
  ['eligibility', 'eligibility'],
  ['required_documents', 'required_documents'],
  ['application_url', 'application_url'],
  ['source_url', 'source_url'],
  ['source_published_at', 'source_published_at'],
  ['application_start_date', 'application_start_date'],
  ['application_deadline', 'application_deadline'],
  ['application_status', 'application_status'],
  ['government_level', 'government_level'],
  ['state', 'state'],
]

function contentChanges(existing, observed) {
  return comparisonFields
    .filter(([storedField, incomingField]) => {
      const previous = JSON.stringify(existing[storedField] ?? null)
      const next = JSON.stringify(observed[incomingField] ?? null)
      return previous !== next
    })
    .map(([storedField]) => storedField)
}

export async function processCandidate(candidate, repository, now = new Date()) {
  const context = await repository.getContext(candidate.sourceId)
  const assessment = assessCandidate(candidate, context, now)
  if (!assessment.persistable) {
    return { outcome: 'rejected', reasons: assessment.reasons }
  }

  let existing = await repository.findByDedupeKey(assessment.dedupeKey)
  if (!existing && candidate.sourceIdentifier) {
    existing = await repository.findBySourceIdentifier(candidate.sourceId, candidate.sourceIdentifier)
  }

  if (existing) {
    const changes = contentChanges(existing, assessment.scheme)
    if (changes.length === 0) {
      if (
        assessment.verificationStatus === 'verified' &&
        existing.verification_status === 'verified' &&
        !existing.is_published
      ) {
        await repository.insertCategories(existing.id, assessment.categoryIds)
        await repository.publish(existing.id, now.toISOString())
        return { outcome: 'published', schemeId: existing.id, reasons: [] }
      }
      if (assessment.verificationStatus !== 'verified') {
        await repository.createReview(existing.id, assessment.reasons)
        return { outcome: 'review', schemeId: existing.id, reasons: assessment.reasons }
      }
      return { outcome: 'duplicate', schemeId: existing.id, reasons: assessment.reasons }
    }
    await repository.recordUpdate({
      schemeId: existing.id,
      sourceId: candidate.sourceId,
      sourceUrl: candidate.sourceUrl,
      sourcePublishedAt: assessment.scheme.source_published_at,
      changedFields: changes,
      previousData: existing,
      observedData: assessment.scheme,
    })
    await repository.createReview(existing.id, [
      ...assessment.reasons,
      `changed_fields:${changes.join(',')}`,
    ])
    return { outcome: 'review', schemeId: existing.id, reasons: assessment.reasons, changedFields: changes }
  }

  const inserted = await repository.insertScheme(assessment.scheme)
  if (assessment.categoryIds.length > 0) {
    await repository.insertCategories(inserted.id, assessment.categoryIds)
  }

  if (assessment.verificationStatus === 'verified') {
    await repository.publish(inserted.id, now.toISOString())
    return { outcome: 'published', schemeId: inserted.id, reasons: [] }
  }

  await repository.createReview(inserted.id, assessment.reasons)
  return { outcome: 'review', schemeId: inserted.id, reasons: assessment.reasons }
}
