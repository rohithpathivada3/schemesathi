import { XMLParser, XMLValidator } from 'fast-xml-parser'
import { supabaseRest } from '../lib/supabaseRest.mjs'

const MAX_RESPONSE_BYTES = 1_000_000
const MAX_REDIRECTS = 3
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308])
const BLOCKED_HEADERS = new Set([
  'connection',
  'content-length',
  'cookie',
  'host',
  'origin',
  'proxy-authorization',
  'transfer-encoding',
])

function isPublicHostname(hostname) {
  const host = hostname.toLowerCase().replace(/\.$/, '')
  return host !== 'localhost' &&
    !host.endsWith('.localhost') &&
    !host.endsWith('.local') &&
    !host.endsWith('.internal') &&
    !host.endsWith('.test') &&
    !host.endsWith('.invalid') &&
    !/^(\d{1,3}\.){3}\d{1,3}$/.test(host) &&
    !host.includes(':')
}

function validateSourceUrl(value, authorizedDomain) {
  let url
  try {
    url = new URL(value)
  } catch {
    throw new Error('Source URL must be an absolute HTTPS URL')
  }

  const domain = String(authorizedDomain ?? '').toLowerCase().replace(/\.$/, '')
  const host = url.hostname.toLowerCase().replace(/\.$/, '')
  const hostIsAuthorized = domain && (host === domain || host.endsWith(`.${domain}`))

  if (
    url.protocol !== 'https:' ||
    !hostIsAuthorized ||
    !isPublicHostname(host) ||
    (url.port && url.port !== '443') ||
    url.username ||
    url.password ||
    url.hash
  ) {
    throw new Error('Source URL is outside its registered HTTPS domain')
  }

  return url
}

function validateSource(source) {
  if (!source || source.trust_status !== 'verified' || source.is_enabled !== true) {
    throw new Error('Only enabled, verified sources can be collected')
  }
  if (source.source_type !== 'api' && source.source_type !== 'rss') {
    throw new Error('Only API and RSS sources can be collected automatically')
  }
  validateSourceUrl(source.source_url, source.authorized_domain)
}

function apiHeaders(source) {
  const headers = new Headers({
    Accept: source.source_type === 'api'
      ? 'application/json'
      : 'application/rss+xml, application/atom+xml, application/xml, text/xml',
    'User-Agent': 'SchemeSathi/1.0 (+public scheme discovery)',
  })

  if (source.api_key_env_var) {
    if (!/^SOURCE_API_KEY_[A-Z0-9_]+$/.test(source.api_key_env_var)) {
      throw new Error('Source API key must use a SOURCE_API_KEY_* environment variable')
    }

    const headerName = String(source.api_key_header ?? 'x-api-key')
    if (!/^[a-zA-Z0-9-]+$/.test(headerName) || BLOCKED_HEADERS.has(headerName.toLowerCase())) {
      throw new Error('Source API key header is not allowed')
    }

    const secret = process.env[source.api_key_env_var]
    if (!secret) {
      throw new Error(`Environment variable ${source.api_key_env_var} is not configured`)
    }
    headers.set(headerName, secret)
  }

  if (source.etag) {
    headers.set('If-None-Match', source.etag)
  }
  if (source.last_modified) {
    headers.set('If-Modified-Since', source.last_modified)
  }

  return headers
}

async function fetchRegisteredSource(source, fetchImpl) {
  let url = validateSourceUrl(source.source_url, source.authorized_domain)
  const headers = apiHeaders(source)

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    let response
    try {
      response = await fetchImpl(url, {
        method: 'GET',
        headers,
        redirect: 'manual',
        signal: AbortSignal.timeout(10000),
      })
    } catch {
      throw new Error('Source request failed before receiving a response')
    }

    if (!REDIRECT_STATUSES.has(response.status)) {
      return { response, url }
    }

    const location = response.headers.get('location')
    await response.body?.cancel()
    if (!location || redirectCount === MAX_REDIRECTS) {
      throw new Error('Source redirect limit exceeded or redirect target was missing')
    }

    url = validateSourceUrl(new URL(location, url).href, source.authorized_domain)
  }

  throw new Error('Source redirect limit exceeded')
}

async function readBoundedText(response) {
  const contentLength = Number(response.headers.get('content-length'))
  if (Number.isFinite(contentLength) && contentLength > MAX_RESPONSE_BYTES) {
    await response.body?.cancel()
    throw new Error('Source response exceeded the size limit')
  }

  if (!response.body) {
    return ''
  }

  const reader = response.body.getReader()
  const chunks = []
  let totalBytes = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    totalBytes += value.byteLength
    if (totalBytes > MAX_RESPONSE_BYTES) {
      await reader.cancel()
      throw new Error('Source response exceeded the size limit')
    }
    chunks.push(value)
  }

  const bytes = new Uint8Array(totalBytes)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return new TextDecoder().decode(bytes)
}

function objectPath(value, path) {
  if (typeof path !== 'string' || !path.trim()) return undefined
  return path.split('.').reduce((current, part) => {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined
    }
    return current[part]
  }, value)
}

function scalar(value) {
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value).trim() || null
  }
  if (value && typeof value === 'object') {
    if (typeof value['#text'] === 'string') return value['#text'].trim() || null
    if (typeof value['@_href'] === 'string') return value['@_href'].trim() || null
  }
  return null
}

function rssItems(parsed) {
  const value = parsed?.rss?.channel?.item ?? parsed?.feed?.entry
  if (value === undefined) {
    throw new Error('RSS or Atom feed did not contain items')
  }
  return Array.isArray(value) ? value : [value]
}

function normalizeCandidate(item, source, fields = {}, feedItem = false) {
  const configuredRaw = (name, aliases) => {
    const path = fields[name]
    if (path) return objectPath(item, path)
    for (const alias of aliases) {
      const value = objectPath(item, alias)
      if (value !== undefined && value !== null) return value
    }
    return null
  }
  const configured = (name, aliases) => scalar(configuredRaw(name, aliases))
  const configuredList = (name, aliases) => {
    const value = configuredRaw(name, aliases)
    if (Array.isArray(value)) {
      return value.map(scalar).filter(Boolean)
    }
    const text = scalar(value)
    return text ? [text] : []
  }

  const sourceUrl = configured('source_url', feedItem ? ['link'] : ['source_url', 'url', 'link'])
  const permittedSourceUrl = sourceUrl
    ? (() => {
      try {
        return validateSourceUrl(sourceUrl, source.authorized_domain).href
      } catch {
        return null
      }
    })()
    : null

  return {
    sourceId: source.id,
    organizationId: source.organization_id,
    sourceIdentifier: configured('source_identifier', ['id', 'guid']),
    title: configured('title', ['title', 'name']),
    description: configured('description', ['description', 'summary', 'content']),
    sourceUrl: permittedSourceUrl,
    sourcePublishedAt: configured('published_at', ['pubDate', 'published', 'updated', 'date']),
    applicationUrl: configured('application_url', ['application_url', 'apply_url']),
    applicationStartDate: configured('application_start_date', ['application_start_date']),
    applicationDeadline: configured('application_deadline', ['application_deadline', 'deadline']),
    applicationStatus: configured('application_status', ['application_status', 'status']),
    benefits: configuredList('benefits', ['benefits']),
    eligibility: configuredList('eligibility', ['eligibility']),
    requiredDocuments: configuredList('required_documents', ['required_documents', 'documents']),
    governmentLevel: configured('government_level', ['government_level']),
    state: configured('state', ['state']),
  }
}

function parseJsonItems(text, source) {
  let document
  try {
    document = JSON.parse(text)
  } catch {
    throw new Error('API source returned invalid JSON')
  }

  const config = source.parser_config ?? {}
  const items = config.items_path ? objectPath(document, config.items_path) : document
  if (!Array.isArray(items)) {
    throw new Error('API source response did not match its configured item list')
  }
  return items.map((item) => normalizeCandidate(item, source, config.fields ?? {}))
}

function parseXmlItems(text, source) {
  if (XMLValidator.validate(text) !== true) {
    throw new Error('RSS source returned invalid XML')
  }
  const parser = new XMLParser({
    ignoreAttributes: false,
    removeNSPrefix: true,
    trimValues: true,
    parseTagValue: false,
    processEntities: false,
  })
  const items = rssItems(parser.parse(text))
  const fields = source.parser_config?.fields ?? {}
  return items.map((item) => normalizeCandidate(item, source, fields, true))
}

export async function listCollectionSources() {
  return supabaseRest('ss_information_sources', {
    select: [
      'id', 'organization_id', 'name', 'source_url', 'source_type', 'authorized_domain',
      'domain_ids', 'parser_config', 'api_key_env_var', 'api_key_header',
      'refresh_interval_minutes', 'max_requests_per_hour', 'last_checked_at', 'last_success_at',
      'etag', 'last_modified',
    ].join(','),
    trust_status: 'eq.verified',
    is_enabled: 'eq.true',
    source_type: 'in.(api,rss)',
    order: 'last_checked_at.asc.nullsfirst',
    limit: '500',
  })
}

export async function fetchSourceItems(source, options = {}) {
  validateSource(source)
  const fetchImpl = options.fetchImpl ?? fetch
  const { response, url } = await fetchRegisteredSource(source, fetchImpl)

  if (response.status === 304) {
    return {
      items: [],
      notModified: true,
      checkedUrl: url.href,
      etag: response.headers.get('etag') ?? source.etag ?? null,
      lastModified: response.headers.get('last-modified') ?? source.last_modified ?? null,
      httpStatus: response.status,
    }
  }
  if (!response.ok) {
    throw new Error(`Source request failed with HTTP ${response.status}`)
  }

  const contentType = (response.headers.get('content-type') ?? '').toLowerCase()
  if (source.source_type === 'api' && !/json|\/[^;]+\+json/.test(contentType)) {
    throw new Error('API source must return a JSON content type')
  }
  if (source.source_type === 'rss' && !/(rss|atom|xml)/.test(contentType)) {
    throw new Error('RSS source must return an XML content type')
  }

  const text = await readBoundedText(response)
  const items = source.source_type === 'api'
    ? parseJsonItems(text, source)
    : parseXmlItems(text, source)

  return {
    items,
    notModified: false,
    checkedUrl: url.href,
    etag: response.headers.get('etag'),
    lastModified: response.headers.get('last-modified'),
    httpStatus: response.status,
  }
}
