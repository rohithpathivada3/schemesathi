import { timingSafeEqual } from 'node:crypto'
import { createSupabaseSchemeRepository } from '../../server/services/supabaseSchemeRepository.mjs'
import { createSupabaseSyncRepository } from '../../server/services/supabaseSyncRepository.mjs'
import { runSynchronization } from '../../server/services/syncService.mjs'

function json(res, status, value) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(value))
}

function authorized(req, secret) {
  const authorization = req.headers?.authorization
  if (typeof authorization !== 'string' || !authorization.startsWith('Bearer ') || !secret) {
    return false
  }
  const received = Buffer.from(authorization.slice(7))
  const expected = Buffer.from(secret)
  return received.length === expected.length && timingSafeEqual(received, expected)
}

export function createSyncHandler(sync = runSynchronization) {
  return async function syncHandler(req, res) {
    if (req.method !== 'GET' && req.method !== 'POST') {
      res.setHeader('Allow', 'GET, POST')
      return json(res, 405, { error: 'method_not_allowed' })
    }
    const secret = process.env.CRON_SECRET
    if (!secret || Buffer.byteLength(secret, 'utf8') < 32) {
      return json(res, 503, { error: 'cron_not_configured' })
    }
    if (!authorized(req, secret)) return json(res, 401, { error: 'unauthorized' })

    try {
      const summary = await sync({
        sourceRepository: createSupabaseSyncRepository(),
        schemeRepository: createSupabaseSchemeRepository(),
      })
      return json(res, 200, { status: 'completed', summary })
    } catch {
      console.error('Scheduled discovery synchronization failed')
      return json(res, 500, { error: 'synchronization_failed' })
    }
  }
}

export default createSyncHandler()
