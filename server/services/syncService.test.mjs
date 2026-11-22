import { describe, expect, it, vi } from 'vitest'
import { runSynchronization } from './syncService.mjs'

const fixedNow = () => new Date('2026-11-22T00:00:00.000Z')

function repositories(sources, { recentRuns = 0 } = {}) {
  const sourceRepository = {
    listSources: vi.fn().mockResolvedValue(sources),
    countRecentRuns: vi.fn().mockResolvedValue(recentRuns),
    createSynchronizationLog: vi.fn().mockResolvedValue('log-1'),
    completeSynchronizationLog: vi.fn().mockResolvedValue(undefined),
    updateSourceCheck: vi.fn().mockResolvedValue(undefined),
  }
  const schemeRepository = {
    getContext: vi.fn(),
    findByDedupeKey: vi.fn(),
    findBySourceIdentifier: vi.fn(),
    insertScheme: vi.fn(),
    insertCategories: vi.fn(),
    publish: vi.fn(),
    recordUpdate: vi.fn(),
    createReview: vi.fn(),
  }
  return { sourceRepository, schemeRepository }
}

const source = {
  id: 'source-1',
  refresh_interval_minutes: 60,
  max_requests_per_hour: 4,
}

describe('scheduled source synchronization', () => {
  it('skips sources within their refresh interval and enforces the hourly request limit', async () => {
    const recent = { ...source, last_checked_at: '2026-11-21T23:30:00.000Z' }
    const { sourceRepository, schemeRepository } = repositories([recent])
    const result = await runSynchronization({
      sourceRepository,
      schemeRepository,
      now: fixedNow,
    })

    expect(result.sourcesSkippedByInterval).toBe(1)
    expect(result.sourcesAttempted).toBe(0)
    expect(sourceRepository.countRecentRuns).not.toHaveBeenCalled()
  })

  it('collects, verifies, persists, and logs eligible candidates', async () => {
    const sourceWithDomains = { ...source, domain_ids: ['education-scholarships', 'jobs-employment'] }
    const { sourceRepository, schemeRepository } = repositories([sourceWithDomains])
    schemeRepository.recordNewSchemeNotification = vi.fn().mockResolvedValue(undefined)
    const fetchItems = vi.fn().mockResolvedValue({
      httpStatus: 200,
      etag: '"v1"',
      lastModified: null,
      items: [{
        sourceId: source.id,
        title: 'Student grant',
        sourceUrl: 'https://example.gov.in/notice',
      }],
    })
    const processCandidateItem = vi.fn().mockResolvedValue({ outcome: 'published', schemeId: 'published-scheme' })
    const result = await runSynchronization({
      sourceRepository,
      schemeRepository,
      fetchItems,
      processCandidateItem,
      now: fixedNow,
    })

    expect(fetchItems).toHaveBeenCalledWith(sourceWithDomains)
    expect(processCandidateItem).toHaveBeenCalledWith(expect.objectContaining({
      sourceId: source.id,
      title: 'Student grant',
    }), schemeRepository, fixedNow())
    expect(schemeRepository.recordNewSchemeNotification).toHaveBeenCalledWith(
      'published-scheme',
      sourceWithDomains.domain_ids,
      { title: 'Student grant', sourceUrl: 'https://example.gov.in/notice' },
    )
    expect(sourceRepository.updateSourceCheck).toHaveBeenCalledWith(source.id, expect.objectContaining({
      last_http_status: 200,
      etag: '"v1"',
    }))
    expect(sourceRepository.completeSynchronizationLog).toHaveBeenCalledWith('log-1', expect.objectContaining({
      status: 'succeeded',
      recordsCreated: 1,
    }))
    expect(result).toMatchObject({ recordsSeen: 1, recordsCreated: 1, sourcesAttempted: 1 })
  })

  it('retries transient source errors once and records terminal failures without leaking them to the summary', async () => {
    const { sourceRepository, schemeRepository } = repositories([source])
    const fetchItems = vi.fn()
      .mockRejectedValueOnce(new Error('Source request failed with HTTP 503'))
      .mockRejectedValueOnce(new Error('Source request failed with HTTP 503'))
    const sleep = vi.fn().mockResolvedValue(undefined)

    const result = await runSynchronization({
      sourceRepository,
      schemeRepository,
      fetchItems,
      now: fixedNow,
      sleep,
    })

    expect(fetchItems).toHaveBeenCalledTimes(2)
    expect(sleep).toHaveBeenCalledWith(250)
    expect(sourceRepository.completeSynchronizationLog).toHaveBeenCalledWith('log-1', expect.objectContaining({
      status: 'failed',
      error_code: 'source_sync_failed',
    }))
    expect(result.sourcesWithIssues).toBe(1)
  })

  it('limits each run and respects per-hour limits', async () => {
    const sources = Array.from({ length: 7 }, (_, index) => ({ ...source, id: `source-${index}` }))
    const { sourceRepository, schemeRepository } = repositories(sources, { recentRuns: 4 })
    const result = await runSynchronization({
      sourceRepository,
      schemeRepository,
      now: fixedNow,
    })

    expect(result.sourcesSkippedByRateLimit).toBe(7)
    expect(sourceRepository.createSynchronizationLog).not.toHaveBeenCalled()
  })

  it('defers due sources after the per-run source cap', async () => {
    const sources = Array.from({ length: 7 }, (_, index) => ({ ...source, id: `source-${index}` }))
    const { sourceRepository, schemeRepository } = repositories(sources)
    const fetchItems = vi.fn().mockResolvedValue({
      items: [],
      httpStatus: 200,
      etag: null,
      lastModified: null,
    })
    const result = await runSynchronization({
      sourceRepository,
      schemeRepository,
      fetchItems,
      now: fixedNow,
    })

    expect(result.sourcesAttempted).toBe(5)
    expect(result.sourcesDeferred).toBe(2)
    expect(sourceRepository.createSynchronizationLog).toHaveBeenCalledTimes(5)
  })
})
