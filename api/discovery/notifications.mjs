import { supabaseRest } from '../../server/lib/supabaseRest.mjs'

const allowedEventTypes = new Set([
  'new_scheme',
  'scheme_updated',
  'deadline_changed',
  'application_opened',
  'closing_soon',
  'verification_changed',
])

function json(res, status, value) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(value))
}

function safeNotice(row) {
  const payload = row.payload && typeof row.payload === 'object' && !Array.isArray(row.payload)
    ? row.payload
    : {}
  let sourceUrl = null
  try {
    const url = new URL(payload.sourceUrl)
    if (
      url.protocol === 'https:' &&
      (!url.port || url.port === '443') &&
      !url.username &&
      !url.password &&
      !url.hash
    ) {
      sourceUrl = url.href
    }
  } catch {}

  if (
    typeof row.id !== 'string' ||
    typeof row.category_id !== 'string' ||
    typeof row.created_at !== 'string' ||
    !Number.isFinite(Date.parse(row.created_at)) ||
    !allowedEventTypes.has(row.event_type) ||
    typeof payload.title !== 'string' ||
    !payload.title.trim() ||
    !sourceUrl
  ) {
    return null
  }
  return {
    id: row.id,
    categoryId: row.category_id,
    createdAt: row.created_at,
    title: payload.title,
    sourceUrl,
  }
}

export async function listDiscoveryNotifications(since) {
  const rows = await supabaseRest('ss_notifications', {
    select: 'id,category_id,event_type,payload,created_at',
    category_id: 'not.is.null',
    created_at: `gt.${since}`,
    order: 'created_at.asc',
    limit: '50',
  })
  return (Array.isArray(rows) ? rows : []).map(safeNotice).filter(Boolean)
}

export function createNotificationsHandler(loadNotifications = listDiscoveryNotifications) {
  return async function notificationsHandler(req, res) {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET')
      return json(res, 405, { error: 'method_not_allowed' })
    }
    const url = new URL(req.url ?? '/', 'https://schemesathi.invalid')
    const since = url.searchParams.get('since')
    const sinceTime = since ? Date.parse(since) : NaN
    const now = Date.now()
    if (!Number.isFinite(sinceTime) || sinceTime > now + 60_000) {
      return json(res, 400, { error: 'invalid_since' })
    }
    try {
      const effectiveSince = Math.max(sinceTime, now - 7 * 86_400_000)
      const notifications = await loadNotifications(new Date(effectiveSince).toISOString())
      return json(res, 200, { notifications })
    } catch (error) {
      if (error instanceof Error &&
        error.message.includes('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')) {
        return json(res, 503, { error: 'discovery_not_configured' })
      }
      console.error('Public notification request failed')
      return json(res, 500, { error: 'notifications_unavailable' })
    }
  }
}

export default createNotificationsHandler()
