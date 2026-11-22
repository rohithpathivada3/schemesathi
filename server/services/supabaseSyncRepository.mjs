import { supabaseRest } from '../lib/supabaseRest.mjs'
import { listCollectionSources } from './sourceCollector.mjs'

export function createSupabaseSyncRepository() {
  return {
    listSources: listCollectionSources,

    async countRecentRuns(sourceId, since, limit) {
      const rows = await supabaseRest('ss_synchronization_logs', {
        select: 'id',
        source_id: `eq.${sourceId}`,
        started_at: `gte.${since}`,
        status: 'in.(running,succeeded,partial,failed)',
        limit: String(limit),
      })
      return Array.isArray(rows) ? rows.length : 0
    },

    async createSynchronizationLog(sourceId, startedAt) {
      const rows = await supabaseRest('ss_synchronization_logs', {}, {
        method: 'POST',
        body: { source_id: sourceId, status: 'running', started_at: startedAt },
        prefer: 'return=representation',
      })
      const log = Array.isArray(rows) ? rows[0] : null
      if (!log?.id) {
        throw new Error('Supabase did not return the synchronization log')
      }
      return log.id
    },

    async completeSynchronizationLog(logId, report) {
      await supabaseRest('ss_synchronization_logs', { id: `eq.${logId}` }, {
        method: 'PATCH',
        body: {
          status: report.status,
          records_seen: report.recordsSeen,
          records_created: report.recordsCreated,
          records_reviewed: report.recordsReviewed,
          records_duplicated: report.recordsDuplicated,
          records_rejected: report.recordsRejected,
          error_code: report.error_code ?? null,
          error_summary: report.error_summary ?? null,
          completed_at: new Date().toISOString(),
        },
        prefer: 'return=minimal',
      })
    },

    async updateSourceCheck(sourceId, check) {
      await supabaseRest('ss_information_sources', { id: `eq.${sourceId}` }, {
        method: 'PATCH',
        body: check,
        prefer: 'return=minimal',
      })
    },
  }
}
