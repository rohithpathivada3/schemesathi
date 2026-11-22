export type DiscoveryNotification = {
  id: string
  categoryId: string
  createdAt: string
  title: string
  sourceUrl: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isDiscoveryNotification(value: unknown): value is DiscoveryNotification {
  if (!isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.categoryId !== 'string' ||
    typeof value.createdAt !== 'string' ||
    !Number.isFinite(Date.parse(value.createdAt)) ||
    typeof value.title !== 'string' ||
    !value.title.trim() ||
    typeof value.sourceUrl !== 'string') {
    return false
  }
  try {
    const url = new URL(value.sourceUrl)
    return url.protocol === 'https:' &&
      (!url.port || url.port === '443') &&
      !url.username &&
      !url.password &&
      !url.hash
  } catch {
    return false
  }
}

export async function getDiscoveryNotifications(
  since: string,
  fetchImpl: typeof fetch = fetch
): Promise<DiscoveryNotification[]> {
  const query = new URLSearchParams({ since })
  const response = await fetchImpl(`/api/discovery/notifications?${query}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(10000),
  })
  if (!response.ok) {
    throw new Error(response.status === 503 ? 'not-configured' : 'request-failed')
  }
  if (!response.headers.get('content-type')?.toLowerCase().includes('application/json')) {
    throw new Error('invalid-response')
  }
  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    throw new Error('invalid-response')
  }
  if (!isRecord(payload) || !Array.isArray(payload.notifications) ||
    !payload.notifications.every(isDiscoveryNotification)) {
    throw new Error('invalid-response')
  }
  return payload.notifications
}
