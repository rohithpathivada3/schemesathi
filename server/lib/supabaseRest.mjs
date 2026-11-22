const tablePattern = /^ss_[a-z_]+$/

function getSupabaseConfig() {
  const projectUrl = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!projectUrl || !serviceKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured')
  }

  let baseUrl
  try {
    baseUrl = new URL(projectUrl)
  } catch {
    throw new Error('SUPABASE_URL must be a valid HTTPS URL')
  }

  const localHttp = baseUrl.protocol === 'http:' &&
    ['localhost', '127.0.0.1'].includes(baseUrl.hostname)
  if (
    (baseUrl.protocol !== 'https:' && !localHttp) ||
    baseUrl.pathname !== '/' ||
    baseUrl.search ||
    baseUrl.hash ||
    baseUrl.username ||
    baseUrl.password
  ) {
    throw new Error('SUPABASE_URL must be a project origin using HTTPS')
  }

  return { baseUrl, serviceKey }
}

export async function supabaseRest(table, query = {}, options = {}) {
  if (!tablePattern.test(table)) {
    throw new Error('Invalid Supabase table name')
  }

  const { baseUrl, serviceKey } = getSupabaseConfig()
  const url = new URL(`/rest/v1/${table}`, baseUrl)
  const searchParams = query instanceof URLSearchParams
    ? query
    : new URLSearchParams(Object.entries(query))
  searchParams.forEach((value, key) => url.searchParams.set(key, value))

  const headers = new Headers({
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    Accept: 'application/json',
  })

  if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json')
  }
  if (options.prefer) {
    headers.set('Prefer', options.prefer)
  }

  const response = await (options.fetchImpl ?? fetch)(url, {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: AbortSignal.timeout(options.timeoutMs ?? 10000),
  })

  if (!response.ok) {
    throw new Error(`Supabase request failed with HTTP ${response.status}`)
  }
  if (response.status === 204) {
    return null
  }

  const text = await response.text()
  if (!text) {
    return null
  }

  try {
    return JSON.parse(text)
  } catch {
    throw new Error('Supabase returned an invalid JSON response')
  }
}
