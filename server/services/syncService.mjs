import { fetchSourceItems } from './sourceCollector.mjs'
import { processCandidate } from './schemeVerification.mjs'

const MAX_SOURCES_PER_RUN = 5
const MAX_PARALLEL_SOURCES = 3
const MAX_REQUESTS_PER_HOUR = 60
const MAX_RETRIES = 1

function isRetryable(error) {
  return error instanceof Error && (
    error.message === 'Source request failed before receiving a response' ||
    /Source request failed with HTTP (429|5\d\d)$/.test(error.message)
  )
}

async function fetchWithRetry(source, fetchItems, sleep) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await fetchItems(source)
    } catch (error) {
      if (attempt >= MAX_RETRIES || !isRetryable(error)) throw error
      await sleep(250)
    }
  }
}

function asPositiveInteger(value, fallback) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

async function mapConcurrent(items, concurrency, callback) {
  const results = new Array(items.length)
  let nextIndex = 0
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (true) {
      const index = nextIndex
      nextIndex += 1
      if (index >= items.length) return
      results[index] = await callback(items[index])
    }
  })
  await Promise.all(workers)
  return results
}

function summaryFor(results, skippedByInterval, skippedByRateLimit, dueButDeferred) {
  return results.reduce((summary, result) => {
    summary.sourcesAttempted += 1
    summary.recordsSeen += result.recordsSeen
    summary.recordsCreated += result.recordsCreated
    summary.recordsReviewed += result.recordsReviewed
    summary.recordsRejected += result.recordsRejected
    summary.recordsDuplicated += result.recordsDuplicated
    if (result.status === 'failed' || result.status === 'partial') summary.sourcesWithIssues += 1
    return summary
  }, {
    sourcesAttempted: 0,
    sourcesSkippedByInterval: skippedByInterval,
    sourcesSkippedByRateLimit: skippedByRateLimit,
    sourcesDeferred: dueButDeferred,
    sourcesWithIssues: 0,
    recordsSeen: 0,
    recordsCreated: 0,
    recordsReviewed: 0,
    recordsRejected: 0,
    recordsDuplicated: 0,
  })
}

export async function runSynchronization({
  sourceRepository,
  schemeRepository,
  fetchItems = fetchSourceItems,
  processCandidateItem = processCandidate,
  now = () => new Date(),
  sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
}) {
  const startedAt = now()
  const sources = await sourceRepository.listSources()
  const sourceDecisions = await Promise.all((Array.isArray(sources) ? sources : []).map(async (source) => {
    const lastCheckedAt = Date.parse(source.last_checked_at ?? '')
    const refreshMinutes = asPositiveInteger(source.refresh_interval_minutes, 1440)
    if (Number.isFinite(lastCheckedAt) &&
      startedAt.getTime() - lastCheckedAt < refreshMinutes * 60_000) {
      return { source, due: false, reason: 'interval' }
    }

    const configuredLimit = asPositiveInteger(source.max_requests_per_hour, 4)
    const requestLimit = Math.min(configuredLimit, MAX_REQUESTS_PER_HOUR)
    const recentRuns = await sourceRepository.countRecentRuns(
      source.id,
      new Date(startedAt.getTime() - 3_600_000).toISOString(),
      requestLimit,
    )
    if (recentRuns >= requestLimit) {
      return { source, due: false, reason: 'rate' }
    }
    return { source, due: true }
  }))

  const dueSources = sourceDecisions.filter((decision) => decision.due).map((decision) => decision.source)
  const selectedSources = dueSources.slice(0, MAX_SOURCES_PER_RUN)
  const deferred = Math.max(0, dueSources.length - selectedSources.length)
  const skippedByInterval = sourceDecisions.filter((decision) => decision.reason === 'interval').length
  const skippedByRateLimit = sourceDecisions.filter((decision) => decision.reason === 'rate').length

  const results = await mapConcurrent(selectedSources, MAX_PARALLEL_SOURCES, async (source) => {
    const sourceStartedAt = now().toISOString()
    const logId = await sourceRepository.createSynchronizationLog(source.id, sourceStartedAt)
    const counts = {
      recordsSeen: 0,
      recordsCreated: 0,
      recordsReviewed: 0,
      recordsRejected: 0,
      recordsDuplicated: 0,
    }

    try {
      const collection = await fetchWithRetry(source, fetchItems, sleep)
      counts.recordsSeen = collection.items.length
      for (const candidate of collection.items) {
        const result = await processCandidateItem(candidate, schemeRepository, now())
        if (result.outcome === 'published') {
          counts.recordsCreated += 1
        } else if (result.outcome === 'review') counts.recordsReviewed += 1
        else if (result.outcome === 'rejected') counts.recordsRejected += 1
        else if (result.outcome === 'duplicate') counts.recordsDuplicated += 1
        if (
          (result.outcome === 'published' || result.outcome === 'duplicate') &&
          result.schemeId &&
          schemeRepository.recordNewSchemeNotification
        ) {
          await schemeRepository.recordNewSchemeNotification(
            result.schemeId,
            source.domain_ids ?? [],
            {
              title: candidate.title,
              sourceUrl: candidate.sourceUrl,
            },
          )
        }
      }

      const hasReview = counts.recordsReviewed > 0 || counts.recordsRejected > 0
      const status = hasReview ? 'partial' : 'succeeded'
      const checkedAt = now().toISOString()
      await sourceRepository.updateSourceCheck(source.id, {
        last_checked_at: checkedAt,
        last_success_at: checkedAt,
        last_http_status: collection.httpStatus,
        etag: collection.etag,
        last_modified: collection.lastModified,
      })
      await sourceRepository.completeSynchronizationLog(logId, {
        status,
        ...counts,
      })
      return { status, ...counts }
    } catch (error) {
      const checkedAt = now().toISOString()
      await sourceRepository.updateSourceCheck(source.id, {
        last_checked_at: checkedAt,
        last_http_status: null,
      })
      await sourceRepository.completeSynchronizationLog(logId, {
        status: counts.recordsSeen > 0 ? 'partial' : 'failed',
        ...counts,
        error_code: 'source_sync_failed',
        error_summary: error instanceof Error
          ? error.message.replace(/[\r\n\t]+/g, ' ').slice(0, 240)
          : 'Source synchronization failed',
      })
      return { status: counts.recordsSeen > 0 ? 'partial' : 'failed', ...counts }
    }
  })

  return summaryFor(results, skippedByInterval, skippedByRateLimit, deferred)
}
