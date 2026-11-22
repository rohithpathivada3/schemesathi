import { useEffect, useState, type FormEvent } from 'react'
import { ArrowLeft, Check, LockKeyhole, RefreshCw, ShieldCheck, X } from 'lucide-react'
import { discoveryDomains } from '../lib/domainMatching'

type Organization = {
  id: string
  name: string
  sector: 'government' | 'private'
  website_url: string
  official_domain: string
  verified_at: string | null
}

type Source = {
  id: string
  organization_id: string
  name: string
  source_url: string
  source_type: 'api' | 'rss' | 'manual'
  authorized_domain: string
  domain_ids: string[]
  parser_config: Record<string, unknown>
  trust_status: 'pending' | 'verified' | 'rejected'
  is_enabled: boolean
  refresh_interval_minutes: number
  max_requests_per_hour: number
  last_checked_at: string | null
  last_success_at: string | null
  last_http_status: number | null
}

type Review = {
  id: string
  scheme_id: string
  notes: string
  created_at: string
  scheme: {
    title: string
    description: string
    source_url: string
    source_published_at: string | null
    application_deadline: string | null
    application_status: string
    verification_status: string
    is_published: boolean
  }
  latestUpdate: {
    source_url: string
    observed_at: string
    changed_fields: string[]
    observed_data: Record<string, unknown>
  } | null
}

type SyncLog = {
  id: string
  status: string
  started_at: string
  records_seen: number
  records_created: number
  records_reviewed: number
  records_rejected: number
  error_summary: string | null
}

type Overview = {
  organizations: Organization[]
  categories: Array<{ id: string; name: string }>
  sources: Source[]
  reviews: Review[]
  synchronizationLogs: SyncLog[]
}

const SESSION_TOKEN_KEY = 'schemesathi_admin_api_token_v1'

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isNullableString(value: unknown) {
  return value === null || typeof value === 'string'
}

function isAdminOverview(value: unknown): value is Overview {
  if (!isRecord(value) ||
    !Array.isArray(value.organizations) ||
    !Array.isArray(value.categories) ||
    !Array.isArray(value.sources) ||
    !Array.isArray(value.reviews) ||
    !Array.isArray(value.synchronizationLogs)) {
    return false
  }
  return value.organizations.every((item) => isRecord(item) &&
      typeof item.id === 'string' && typeof item.name === 'string' &&
      typeof item.official_domain === 'string' && isNullableString(item.verified_at)) &&
    value.categories.every((item) => isRecord(item) &&
      typeof item.id === 'string' && typeof item.name === 'string') &&
    value.sources.every((item) => isRecord(item) &&
      typeof item.id === 'string' && typeof item.name === 'string' &&
      typeof item.source_url === 'string' && Array.isArray(item.domain_ids) &&
      item.domain_ids.every((id) => typeof id === 'string') &&
      isRecord(item.parser_config) && typeof item.is_enabled === 'boolean' &&
      typeof item.trust_status === 'string' && isNullableString(item.last_checked_at)) &&
    value.reviews.every((item) => isRecord(item) &&
      typeof item.id === 'string' && typeof item.notes === 'string' &&
      typeof item.created_at === 'string' && isRecord(item.scheme) &&
      typeof item.scheme.title === 'string' &&
      typeof item.scheme.source_url === 'string' &&
      (item.latestUpdate === null || (
        isRecord(item.latestUpdate) &&
        typeof item.latestUpdate.source_url === 'string' &&
        Array.isArray(item.latestUpdate.changed_fields) &&
        isRecord(item.latestUpdate.observed_data)
      ))) &&
    value.synchronizationLogs.every((item) => isRecord(item) &&
      typeof item.id === 'string' && typeof item.status === 'string' &&
      typeof item.records_seen === 'number' && typeof item.records_created === 'number')
}

async function adminRequest(
  path: string,
  token: string,
  options: RequestInit = {},
): Promise<unknown> {
  const headers = new Headers(options.headers)
  headers.set('Accept', 'application/json')
  headers.set('Authorization', `Bearer ${token}`)
  if (options.body !== undefined) headers.set('Content-Type', 'application/json')
  const response = await fetch(path, {
    ...options,
    headers,
    signal: options.signal ?? AbortSignal.timeout(30_000),
  })
  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    throw new Error('The admin API returned an invalid response.')
  }
  if (!response.ok) {
    const error = payload && typeof payload === 'object' && 'error' in payload &&
      typeof payload.error === 'string'
      ? payload.error
      : `request_failed_${response.status}`
    const details = payload && typeof payload === 'object' && 'details' in payload &&
      Array.isArray(payload.details)
      ? `: ${payload.details.join(', ')}`
      : ''
    throw new Error(`${error}${details}`)
  }
  return payload
}

function safeHttpsUrl(value: string) {
  try {
    const url = new URL(value)
    if (
      url.protocol === 'https:' &&
      (!url.port || url.port === '443') &&
      !url.username &&
      !url.password &&
      !url.hash
    ) return url.href
  } catch {}
  return null
}

function formatTime(value: string | null) {
  if (!value) return 'Never'
  const date = new Date(value)
  return Number.isFinite(date.getTime()) ? date.toLocaleString() : 'Unknown'
}

function storeSessionToken(token: string | null) {
  try {
    if (token) sessionStorage.setItem(SESSION_TOKEN_KEY, token)
    else sessionStorage.removeItem(SESSION_TOKEN_KEY)
    return true
  } catch {
    return false
  }
}

function loadSessionToken() {
  try {
    return sessionStorage.getItem(SESSION_TOKEN_KEY) ?? ''
  } catch {
    return ''
  }
}

export function AdminPortal() {
  const [token, setToken] = useState(loadSessionToken)
  const [credential, setCredential] = useState('')
  const [overview, setOverview] = useState<Overview | null>(null)
  const [loading, setLoading] = useState(false)
  const [busyAction, setBusyAction] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function loadOverview(accessToken: string) {
    setLoading(true)
    setError('')
    try {
      const payload = await adminRequest('/api/admin/overview', accessToken)
      if (!isAdminOverview(payload)) throw new Error('invalid_admin_response')
      setOverview(payload)
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'admin_request_failed'
      setError(message)
      storeSessionToken(null)
      setToken('')
      setOverview(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!token) return
    let active = true
    adminRequest('/api/admin/overview', token)
      .then((data) => {
        if (active) {
          if (!isAdminOverview(data)) throw new Error('invalid_admin_response')
          setOverview(data)
          setError('')
        }
      })
      .catch((requestError: unknown) => {
        if (!active) return
        const message = requestError instanceof Error ? requestError.message : 'admin_request_failed'
        setError(message)
        storeSessionToken(null)
        setToken('')
        setOverview(null)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [token])

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = credential.trim()
    if (!value) {
      setError('Enter the admin key to continue.')
      return
    }
    setError('')
    setNotice('')
    setLoading(true)
    try {
      const payload = await adminRequest('/api/admin/overview', value)
      if (!isAdminOverview(payload)) throw new Error('invalid_admin_response')
      if (!storeSessionToken(value)) throw new Error('Session storage is unavailable in this browser.')
      setOverview(payload)
      setToken(value)
      setCredential('')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'admin_request_failed')
    } finally {
      setLoading(false)
    }
  }

  async function runAction(action: Record<string, unknown>, successMessage: string) {
    setBusyAction(String(action.action ?? 'action'))
    setError('')
    setNotice('')
    try {
      await adminRequest('/api/admin/actions', token, {
        method: 'POST',
        body: JSON.stringify(action),
      })
      setNotice(successMessage)
      await loadOverview(token)
      return true
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'admin_request_failed')
      return false
    } finally {
      setBusyAction('')
    }
  }

  async function createOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const values = new FormData(form)
    if (await runAction({
      action: 'organization.create',
      name: values.get('name'),
      sector: values.get('sector'),
      officialDomain: values.get('officialDomain'),
      websiteUrl: values.get('websiteUrl'),
    }, 'Organization added as unverified. Verify its official website before enabling sources.')) form.reset()
  }

  async function createSource(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const values = new FormData(form)
    let parserConfig: unknown
    try {
      parserConfig = JSON.parse(String(values.get('parserConfig') || '{}'))
    } catch {
      setError('Parser configuration must be valid JSON.')
      return
    }
    if (await runAction({
      action: 'source.create',
      name: values.get('name'),
      organizationId: values.get('organizationId'),
      sourceType: values.get('sourceType'),
      sourceUrl: values.get('sourceUrl'),
      authorizedDomain: values.get('authorizedDomain'),
      domainIds: values.getAll('domainIds'),
      parserConfig,
      apiKeyEnvVar: values.get('apiKeyEnvVar') || null,
      apiKeyHeader: values.get('apiKeyHeader') || 'x-api-key',
      refreshIntervalMinutes: values.get('refreshIntervalMinutes'),
      maxRequestsPerHour: values.get('maxRequestsPerHour'),
    }, 'Source saved as pending and disabled. Review it before enabling collection.')) form.reset()
  }

  function logout() {
    storeSessionToken(null)
    setToken('')
    setOverview(null)
    setError('')
    setNotice('You have been signed out of the admin portal.')
  }

  const verifiedOrganizations = overview?.organizations.filter((organization) =>
    Boolean(organization.verified_at)
  ) ?? []
  const initialLoadPending = Boolean(token && !overview && !error)

  return (
    <main className="admin-portal">
      <header className="admin-header">
        <div>
          <p className="admin-eyebrow"><ShieldCheck size={14} /> SCHEMESATHI ADMIN</p>
          <h1>Discovery operations</h1>
          <p>Manage official sources and review unverified changes. Public discovery remains login-free.</p>
        </div>
        <a href="/" className="admin-home-link"><ArrowLeft size={15} /> Public site</a>
      </header>

      {error && <p className="admin-alert admin-alert-error" role="alert">{error}</p>}
      {notice && <p className="admin-alert" role="status">{notice}</p>}

      {!token && (
        <section className="admin-login-card" aria-labelledby="admin-login-title">
          <LockKeyhole size={24} aria-hidden="true" />
          <h2 id="admin-login-title">Admin access</h2>
          <p>Enter the admin key configured by the site operator. It is not embedded in the website.</p>
          <form onSubmit={handleLogin}>
            <label htmlFor="admin-api-key">Admin API key</label>
            <input
              id="admin-api-key"
              type="password"
              autoComplete="off"
              minLength={32}
              maxLength={256}
              value={credential}
              onChange={(event) => setCredential(event.target.value)}
              required
            />
            <button type="submit" disabled={loading}>
              {loading ? 'Checking…' : 'Continue'}
            </button>
          </form>
        </section>
      )}

      {token && (loading || initialLoadPending) && !overview && <p className="admin-loading" role="status">Loading protected admin data…</p>}
      {token && !loading && !initialLoadPending && !overview && (
        <div className="admin-empty-session">
          <p>Admin data is unavailable. Check the deployment configuration, then retry or sign out.</p>
          <button type="button" onClick={() => void loadOverview(token)}>Retry</button>
          <button type="button" onClick={logout}>Sign out</button>
        </div>
      )}
      {token && overview && (
        <>
          <div className="admin-toolbar">
            <p>Admin key is held in this tab’s session storage only.</p>
            <div>
              <button type="button" onClick={() => void loadOverview(token)} disabled={loading}>
                <RefreshCw size={14} /> Refresh
              </button>
              <button type="button" onClick={logout}><X size={14} /> Sign out</button>
            </div>
          </div>

          <section className="admin-panel" aria-labelledby="admin-org-title">
            <div className="admin-panel-heading">
              <div><p className="admin-eyebrow">TRUSTED ORGANIZATIONS</p><h2 id="admin-org-title">Organization registry</h2></div>
              <span>{overview.organizations.length} total</span>
            </div>
            <p className="admin-guidance">Verify an organization only after checking its official government or organization website independently.</p>
            <div className="admin-two-column">
              <form className="admin-form" onSubmit={createOrganization}>
                <h3>Add organization</h3>
                <label>Name<input name="name" required maxLength={160} /></label>
                <label>Sector
                  <select name="sector" defaultValue="government">
                    <option value="government">Government</option>
                    <option value="private">Private</option>
                  </select>
                </label>
                <label>Official domain<input name="officialDomain" placeholder="department.gov.in" required /></label>
                <label>Official website URL<input name="websiteUrl" type="url" placeholder="https://department.gov.in" required /></label>
                <button type="submit" disabled={Boolean(busyAction)}>Add pending organization</button>
              </form>
              <div className="admin-list">
                {overview.organizations.length === 0 && <p>No organizations registered.</p>}
                {overview.organizations.map((organization) => (
                  <article className="admin-list-item" key={organization.id}>
                    <div><strong>{organization.name}</strong><span>{organization.sector} · {organization.official_domain}</span></div>
                    {organization.verified_at
                      ? <span className="admin-badge admin-badge-good">Verified</span>
                      : <button
                        type="button"
                        disabled={Boolean(busyAction)}
                        onClick={() => void runAction({
                          action: 'organization.verify',
                          id: organization.id,
                          confirmOfficial: true,
                        }, 'Organization marked verified.')}
                      >Verify website</button>}
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section className="admin-panel" aria-labelledby="admin-source-title">
            <div className="admin-panel-heading">
              <div><p className="admin-eyebrow">OFFICIAL FEED MANAGEMENT</p><h2 id="admin-source-title">Source registry</h2></div>
              <span>{overview.sources.length} total</span>
            </div>
            <p className="admin-guidance">Register only permitted official APIs or RSS feeds. Collection is HTTPS-only, same-domain, capped, and does not scrape web pages.</p>
            <div className="admin-two-column">
              <form className="admin-form" onSubmit={createSource}>
                <h3>Add API or RSS source</h3>
                <label>Source name<input name="name" required maxLength={160} /></label>
                <label>Organization
                  <select name="organizationId" required defaultValue="">
                    <option value="" disabled>Select organization</option>
                    {overview.organizations.map((organization) => (
                      <option key={organization.id} value={organization.id}>
                        {organization.name}{organization.verified_at ? '' : ' (unverified)'}
                      </option>
                    ))}
                  </select>
                </label>
                <label>Source type
                  <select name="sourceType" defaultValue="rss">
                    <option value="rss">RSS / Atom</option>
                    <option value="api">JSON API</option>
                  </select>
                </label>
                <label>HTTPS source URL<input name="sourceUrl" type="url" placeholder="https://department.gov.in/feed.xml" required /></label>
                <label>Authorized domain<input name="authorizedDomain" placeholder="department.gov.in" required /></label>
                <label>Domain categories
                  <select name="domainIds" multiple required size={Math.min(6, Math.max(3, overview.categories.length))}>
                    {overview.categories.map((category) => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </select>
                </label>
                <label>Parser configuration (JSON)
                  <textarea name="parserConfig" rows={5} defaultValue={'{}'} spellCheck={false} />
                </label>
                <label>API key environment variable (optional)<input name="apiKeyEnvVar" placeholder="SOURCE_API_KEY_EXAMPLE" /></label>
                <label>API key header<input name="apiKeyHeader" defaultValue="x-api-key" /></label>
                <div className="admin-form-row">
                  <label>Refresh interval (minutes)<input name="refreshIntervalMinutes" type="number" min="15" max="43200" defaultValue="1440" /></label>
                  <label>Requests per hour<input name="maxRequestsPerHour" type="number" min="1" max="60" defaultValue="4" /></label>
                </div>
                <button type="submit" disabled={Boolean(busyAction) || overview.organizations.length === 0}>Add pending source</button>
              </form>
              <div className="admin-list">
                {overview.sources.length === 0 && <p>No source feeds registered. Live discovery remains empty until sources are reviewed.</p>}
                {overview.sources.map((source) => {
                  const organization = overview.organizations.find((item) => item.id === source.organization_id)
                  const sourceUrl = safeHttpsUrl(source.source_url)
                  return (
                    <article className="admin-list-item admin-source-item" key={source.id}>
                      <div>
                        <strong>{source.name}</strong>
                        <span>{organization?.name ?? 'Unknown organization'} · {source.source_type.toUpperCase()} · {source.trust_status}</span>
                        {sourceUrl && <a href={sourceUrl} target="_blank" rel="noreferrer">Open registered feed</a>}
                        <span>Last checked: {formatTime(source.last_checked_at)} · HTTP {source.last_http_status ?? '—'}</span>
                      </div>
                      <div className="admin-button-stack">
                        {source.source_type === 'manual'
                          ? <span className="admin-badge">Manual-only source</span>
                          : source.is_enabled
                          ? <button type="button" disabled={Boolean(busyAction)} onClick={() => void runAction({ action: 'source.disable', id: source.id }, 'Source disabled.')}>Disable</button>
                          : <button
                            type="button"
                            disabled={Boolean(busyAction) || !organization?.verified_at}
                            onClick={() => void runAction({
                              action: 'source.verify',
                              id: source.id,
                              confirmOfficial: true,
                            }, 'Source verified and enabled.')}
                          >Verify &amp; enable</button>}
                        {source.trust_status !== 'rejected' && (
                          <button
                            type="button"
                            className="admin-danger-button"
                            disabled={Boolean(busyAction)}
                            onClick={() => void runAction({ action: 'source.reject', id: source.id }, 'Source rejected and disabled.')}
                          >Reject</button>
                        )}
                      </div>
                    </article>
                  )
                })}
              </div>
            </div>
            {verifiedOrganizations.length === 0 && (
              <p className="admin-guidance">Verify an organization before enabling one of its sources.</p>
            )}
          </section>

          <section className="admin-panel" aria-labelledby="admin-review-title">
            <div className="admin-panel-heading">
              <div><p className="admin-eyebrow">HUMAN VERIFICATION</p><h2 id="admin-review-title">Review queue</h2></div>
              <span>{overview.reviews.length} pending</span>
            </div>
            <div className="admin-review-list">
              {overview.reviews.length === 0 && <p>No records need review.</p>}
              {overview.reviews.map((review) => {
                const sourceUrl = safeHttpsUrl(review.latestUpdate?.source_url ?? review.scheme.source_url)
                const observedSourcePublishedAt = review.latestUpdate?.observed_data.source_published_at
                const observedDeadline = review.latestUpdate?.observed_data.application_deadline
                return (
                  <article className="admin-review-card" key={review.id}>
                    <div className="admin-panel-heading">
                      <div><h3>{review.scheme.title}</h3><span>{review.scheme.verification_status} · {review.scheme.application_status}</span></div>
                      <span>{formatTime(review.latestUpdate?.observed_at ?? review.created_at)}</span>
                    </div>
                    <p>{review.notes || 'No review notes were supplied.'}</p>
                    {review.latestUpdate?.changed_fields?.length ? (
                      <p><strong>Observed changes:</strong> {review.latestUpdate.changed_fields.join(', ')}</p>
                    ) : null}
                    <dl>
                      <div><dt>Source publication</dt><dd>{typeof observedSourcePublishedAt === 'string' ? observedSourcePublishedAt : review.scheme.source_published_at ?? 'Not provided'}</dd></div>
                      <div><dt>Application deadline</dt><dd>{typeof observedDeadline === 'string' ? observedDeadline : review.scheme.application_deadline ?? 'Not stated'}</dd></div>
                    </dl>
                    {sourceUrl && <a href={sourceUrl} target="_blank" rel="noreferrer">Review official source</a>}
                    <div className="admin-review-actions">
                      <button
                        type="button"
                        disabled={Boolean(busyAction)}
                        onClick={() => void runAction({
                          action: 'review.approve',
                          reviewId: review.id,
                          decision: 'approve',
                          confirmOfficial: true,
                        }, 'Review approved after verification.')}
                      ><Check size={14} /> Approve verified record</button>
                      <button
                        type="button"
                        className="admin-danger-button"
                        disabled={Boolean(busyAction)}
                        onClick={() => void runAction({
                          action: 'review.reject',
                          reviewId: review.id,
                          decision: 'reject',
                        }, 'Review rejected.')}
                      ><X size={14} /> Reject</button>
                    </div>
                  </article>
                )
              })}
            </div>
          </section>

          <section className="admin-panel" aria-labelledby="admin-sync-title">
            <div className="admin-panel-heading">
              <div><p className="admin-eyebrow">COLLECTION HISTORY</p><h2 id="admin-sync-title">Synchronization logs</h2></div>
              <span>Latest {overview.synchronizationLogs.length}</span>
            </div>
            <div className="admin-log-list">
              {overview.synchronizationLogs.length === 0 && <p>No synchronization runs recorded.</p>}
              {overview.synchronizationLogs.map((log) => (
                <article className="admin-log-row" key={log.id}>
                  <strong>{log.status}</strong>
                  <span>{formatTime(log.started_at)}</span>
                  <span>{log.records_seen} seen · {log.records_created} published · {log.records_reviewed} review · {log.records_rejected} rejected</span>
                  {log.error_summary && <span className="admin-log-error">{log.error_summary}</span>}
                </article>
              ))}
            </div>
          </section>
        </>
      )}

      <footer className="admin-footer">
        <span>Admin API credentials are never bundled in the public frontend.</span>
        <span>{discoveryDomains.length} discovery categories</span>
      </footer>
    </main>
  )
}
