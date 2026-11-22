import { supabaseRest } from '../../server/lib/supabaseRest.mjs'
import { requireAdmin, sendAdminError, sendAdminJson } from '../../server/lib/adminHttp.mjs'

function related(value) {
  return Array.isArray(value) ? value[0] ?? null : value
}

export async function loadAdminOverview() {
  const [organizations, categories, sources, reviews, updates, logs] = await Promise.all([
    supabaseRest('ss_organizations', {
      select: 'id,name,sector,website_url,official_domain,verified_at',
      order: 'name.asc',
      limit: '200',
    }),
    supabaseRest('ss_scheme_categories', {
      select: 'id,name',
      is_active: 'eq.true',
      order: 'name.asc',
      limit: '100',
    }),
    supabaseRest('ss_information_sources', {
      select: [
        'id,organization_id,name,source_url,source_type,authorized_domain,domain_ids',
        'parser_config,trust_status,is_enabled,refresh_interval_minutes,max_requests_per_hour',
        'last_checked_at,last_success_at,last_http_status,created_at',
      ].join(','),
      order: 'created_at.desc',
      limit: '200',
    }),
    supabaseRest('ss_administrator_reviews', {
      select: 'id,scheme_id,notes,created_at,updated_at,scheme:ss_schemes!inner(id,title,description,source_url,source_published_at,application_deadline,application_status,verification_status,is_published,source_id)',
      status: 'eq.pending',
      order: 'created_at.asc',
      limit: '200',
    }),
    supabaseRest('ss_scheme_updates', {
      select: 'id,scheme_id,source_url,source_published_at,observed_at,changed_fields,observed_data,review_status',
      review_status: 'in.(pending,conflict)',
      order: 'observed_at.desc',
      limit: '500',
    }),
    supabaseRest('ss_synchronization_logs', {
      select: 'id,source_id,status,started_at,completed_at,records_seen,records_created,records_updated,records_reviewed,records_duplicated,records_rejected,error_code,error_summary',
      order: 'started_at.desc',
      limit: '50',
    }),
  ])

  const updatesByScheme = new Map()
  for (const update of Array.isArray(updates) ? updates : []) {
    if (!updatesByScheme.has(update.scheme_id)) updatesByScheme.set(update.scheme_id, update)
  }

  return {
    organizations: Array.isArray(organizations) ? organizations : [],
    categories: Array.isArray(categories) ? categories : [],
    sources: Array.isArray(sources) ? sources : [],
    reviews: (Array.isArray(reviews) ? reviews : []).map((review) => ({
      ...review,
      scheme: related(review.scheme),
      latestUpdate: updatesByScheme.get(review.scheme_id) ?? null,
    })),
    synchronizationLogs: Array.isArray(logs) ? logs : [],
  }
}

export default async function adminOverviewHandler(req, res) {
  if (!requireAdmin(req, res)) return
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return sendAdminJson(res, 405, { error: 'method_not_allowed' })
  }
  try {
    return sendAdminJson(res, 200, await loadAdminOverview())
  } catch (error) {
    return sendAdminError(res, error)
  }
}
