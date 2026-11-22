import { describe, expect, it, vi } from 'vitest'
import { fetchSourceItems } from './sourceCollector.mjs'

const apiSource = {
  id: 'api-1',
  name: 'Official API',
  source_type: 'api',
  source_url: 'https://data.gov.in/api',
  authorized_domain: 'data.gov.in',
  is_enabled: true,
  trust_status: 'verified',
  parser_config: {
    items_path: 'result.records',
    fields: {
      title: 'scheme_name',
      description: 'summary',
      source_url: 'details_url',
      source_identifier: 'record_id',
      published_at: 'published',
      application_url: 'apply_url',
    },
  },
}

function response(body, contentType, status = 200, headers = {}) {
  return new Response(body, {
    status,
    headers: { 'content-type': contentType, ...headers },
  })
}

describe('fetchSourceItems', () => {
  it('maps only configured JSON source fields and leaves unavailable facts empty', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response(JSON.stringify({
      result: {
        records: [{
          record_id: 'a-1',
          scheme_name: 'Student grant',
          summary: 'Official announcement',
          details_url: 'https://data.gov.in/notice/a-1',
          published: '2026-11-20',
        }],
      },
    }), 'application/json'))

    const result = await fetchSourceItems(apiSource, { fetchImpl })

    expect(result.items[0]).toMatchObject({
      sourceId: 'api-1',
      sourceIdentifier: 'a-1',
      title: 'Student grant',
      description: 'Official announcement',
      sourceUrl: 'https://data.gov.in/notice/a-1',
      sourcePublishedAt: '2026-11-20',
      applicationUrl: null,
      benefits: [],
      eligibility: [],
      requiredDocuments: [],
    })
    expect(fetchImpl).toHaveBeenCalledWith(
      new URL(apiSource.source_url),
      expect.objectContaining({ method: 'GET', redirect: 'manual' }),
    )
  })

  it('extracts RSS items without inventing benefit, eligibility, or apply links', async () => {
    const source = {
      ...apiSource,
      source_type: 'rss',
      source_url: 'https://data.gov.in/announcements.xml',
      parser_config: {},
    }
    const xml = '<rss><channel><item><title>New scholarship</title><link>https://data.gov.in/notices/1</link><description>Details</description><pubDate>2026-11-20</pubDate></item></channel></rss>'
    const result = await fetchSourceItems(source, {
      fetchImpl: vi.fn().mockResolvedValue(response(xml, 'application/rss+xml')),
    })

    expect(result.items[0]).toMatchObject({
      title: 'New scholarship',
      description: 'Details',
      sourceUrl: 'https://data.gov.in/notices/1',
      sourcePublishedAt: '2026-11-20',
      applicationUrl: null,
    })
  })

  it('blocks unverified sources and rejects cross-domain redirects', async () => {
    const fetchImpl = vi.fn()
    await expect(fetchSourceItems({ ...apiSource, trust_status: 'pending' }, { fetchImpl }))
      .rejects.toThrow('Only enabled, verified sources can be collected')
    expect(fetchImpl).not.toHaveBeenCalled()

    const redirectFetch = vi.fn().mockResolvedValue(new Response(null, {
      status: 302,
      headers: { location: 'https://attacker.example/redirect' },
    }))
    await expect(fetchSourceItems(apiSource, { fetchImpl: redirectFetch }))
      .rejects.toThrow('Source URL is outside its registered HTTPS domain')
    expect(redirectFetch).toHaveBeenCalledTimes(1)
  })

  it('rejects insecure, malformed, and oversized source responses', async () => {
    const fetchImpl = vi.fn()
    await expect(fetchSourceItems({ ...apiSource, source_url: 'http://data.gov.in/api' }, { fetchImpl }))
      .rejects.toThrow('Source URL is outside its registered HTTPS domain')
    expect(fetchImpl).not.toHaveBeenCalled()

    await expect(fetchSourceItems(apiSource, {
      fetchImpl: vi.fn().mockResolvedValue(response('{invalid', 'application/json')),
    })).rejects.toThrow('API source returned invalid JSON')

    await expect(fetchSourceItems(apiSource, {
      fetchImpl: vi.fn().mockResolvedValue(response('x'.repeat(1_000_001), 'application/json')),
    })).rejects.toThrow('Source response exceeded the size limit')
  })

  it('honors conditional requests when the source has not changed', async () => {
    const source = { ...apiSource, etag: '"source-v1"' }
    const fetchImpl = vi.fn().mockResolvedValue(new Response(null, {
      status: 304,
      headers: { etag: '"source-v1"' },
    }))
    const result = await fetchSourceItems(source, { fetchImpl })

    expect(result).toMatchObject({ items: [], notModified: true, etag: '"source-v1"' })
    expect(fetchImpl.mock.calls[0][1].headers.get('If-None-Match')).toBe('"source-v1"')
  })
})
