import { describe, expect, it, vi } from 'vitest'
import { assessCandidate, processCandidate } from './schemeVerification.mjs'

const now = new Date('2026-11-22T00:00:00.000Z')
const categoryId = 'education-scholarships'
const context = {
  source: {
    id: 'source-1',
    organization_id: 'organization-1',
    authorized_domain: 'example.gov.in',
    domain_ids: [categoryId],
    trust_status: 'verified',
    is_enabled: true,
  },
  organization: {
    id: 'organization-1',
    sector: 'government',
    official_domain: 'example.gov.in',
    verified_at: '2026-11-20T00:00:00.000Z',
  },
  categoryIds: [categoryId],
}
const candidate = {
  sourceId: 'source-1',
  organizationId: 'organization-1',
  sourceIdentifier: 'notice-1',
  title: 'Student grant',
  description: 'Officially announced student support.',
  sourceUrl: 'https://example.gov.in/notices/student-grant',
  sourcePublishedAt: '2026-11-20',
  applicationUrl: 'https://example.gov.in/apply/student-grant',
  applicationStartDate: '2026-11-01',
  applicationDeadline: '2026-12-01',
  applicationStatus: 'active',
  benefits: ['Financial support'],
  eligibility: ['Students enrolled in an eligible program'],
  requiredDocuments: ['Proof of enrollment'],
}

describe('scheme verification pipeline', () => {
  it('publishes only when source, organization, dates, domains, and required content are verified', () => {
    const assessment = assessCandidate(candidate, context, now)

    expect(assessment).toMatchObject({
      persistable: true,
      verificationStatus: 'verified',
      applicationStatus: 'active',
      reasons: [],
      categoryIds: [categoryId],
    })
    expect(assessment.scheme).toMatchObject({
      sector: 'government',
      is_published: false,
      last_verified_at: now.toISOString(),
      application_url: candidate.applicationUrl,
    })
  })

  it('holds missing source facts for review instead of inventing details or marking active', () => {
    const assessment = assessCandidate({
      ...candidate,
      sourcePublishedAt: null,
      applicationStatus: null,
      applicationStartDate: null,
      applicationDeadline: null,
      benefits: [],
      eligibility: [],
      requiredDocuments: [],
    }, context, now)

    expect(assessment.verificationStatus).toBe('pending')
    expect(assessment.applicationStatus).toBe('verification_required')
    expect(assessment.scheme.benefits).toEqual([])
    expect(assessment.scheme.last_verified_at).toBeNull()
    expect(assessment.reasons).toContain('publication_date_missing_or_invalid')
    expect(assessment.reasons).toContain('benefits_missing')
    expect(assessment.reasons).toContain('eligibility_missing')
  })

  it('flags conflicting dates and unverified domains for human review', () => {
    const conflicting = assessCandidate({
      ...candidate,
      applicationStartDate: '2026-12-10',
      applicationDeadline: '2026-12-01',
      applicationStatus: 'active',
    }, context, now)
    const externalApplyLink = assessCandidate({
      ...candidate,
      applicationUrl: 'https://unrelated.example/apply',
    }, context, now)

    expect(conflicting.verificationStatus).toBe('conflict')
    expect(conflicting.applicationStatus).toBe('verification_required')
    expect(externalApplyLink.verificationStatus).toBe('pending')
    expect(externalApplyLink.scheme.application_url).toBeNull()
  })

  it('uses the seven-day closing-soon threshold and marks past deadlines closed', () => {
    const closingSoon = assessCandidate({
      ...candidate,
      applicationDeadline: '2026-11-29',
    }, context, now)
    const closed = assessCandidate({
      ...candidate,
      applicationStatus: null,
      applicationDeadline: '2026-11-21',
    }, context, now)

    expect(closingSoon.applicationStatus).toBe('closing_soon')
    expect(closed.applicationStatus).toBe('closed')
    expect(closed.verificationStatus).toBe('verified')
  })

  it('uses a stable identity key to detect duplicates and records changed facts for review', async () => {
    const baseline = assessCandidate(candidate, context, now).scheme
    const repository = {
      getContext: vi.fn().mockResolvedValue(context),
      findByDedupeKey: vi.fn().mockResolvedValue({
        ...baseline,
        id: 'existing-1',
        is_published: true,
        published_at: now.toISOString(),
      }),
      findBySourceIdentifier: vi.fn(),
      recordUpdate: vi.fn(),
      createReview: vi.fn(),
      insertScheme: vi.fn(),
      insertCategories: vi.fn(),
      publish: vi.fn(),
    }

    const unchanged = await processCandidate(candidate, repository, now)
    expect(unchanged.outcome).toBe('duplicate')

    const changed = await processCandidate({
      ...candidate,
      applicationDeadline: '2026-12-05',
    }, repository, now)
    expect(changed.outcome).toBe('review')
    expect(changed.changedFields).toContain('application_deadline')
    expect(repository.recordUpdate).toHaveBeenCalledTimes(1)
    expect(repository.createReview).toHaveBeenCalledTimes(1)
    expect(repository.publish).not.toHaveBeenCalled()
  })

  it('stores a new verified record privately before linking categories and publishing it', async () => {
    const repository = {
      getContext: vi.fn().mockResolvedValue(context),
      findByDedupeKey: vi.fn().mockResolvedValue(null),
      findBySourceIdentifier: vi.fn().mockResolvedValue(null),
      insertScheme: vi.fn().mockResolvedValue({ id: 'new-1' }),
      insertCategories: vi.fn().mockResolvedValue(undefined),
      publish: vi.fn().mockResolvedValue(undefined),
      createReview: vi.fn(),
    }

    const result = await processCandidate(candidate, repository, now)

    expect(result.outcome).toBe('published')
    expect(repository.insertScheme.mock.invocationCallOrder[0])
      .toBeLessThan(repository.insertCategories.mock.invocationCallOrder[0])
    expect(repository.insertCategories.mock.invocationCallOrder[0])
      .toBeLessThan(repository.publish.mock.invocationCallOrder[0])
    expect(repository.insertScheme.mock.calls[0][0].is_published).toBe(false)
  })
})
