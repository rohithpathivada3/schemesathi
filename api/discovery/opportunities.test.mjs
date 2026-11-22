import { describe, expect, it, vi } from 'vitest'
import { createDiscoveryHandler, toPublicOpportunity } from './opportunities.mjs'

function responseRecorder() {
  return {
    headers: {},
    setHeader(name, value) { this.headers[name] = value },
    end(value) { this.body = value },
  }
}

const row = {
  id: 'scheme-1',
  title: 'Student grant',
  sector: 'government',
  description: 'Support for students',
  benefits: ['Financial support'],
  eligibility: ['Students'],
  required_documents: ['Proof of enrollment'],
  source_url: 'https://example.gov.in/notice',
  source_published_at: '2026-11-20',
  application_url: null,
  application_start_date: null,
  application_deadline: '2026-12-01',
  application_status: 'active',
  last_verified_at: '2026-11-21T00:00:00.000Z',
  organization: { name: 'Official Department', official_domain: 'example.gov.in' },
  domain_links: [{ category_id: 'education-scholarships' }],
}

describe('public discovery API', () => {
  it('maps verified database rows to the public frontend shape', () => {
    expect(toPublicOpportunity(row, new Set(['education-scholarships']))).toMatchObject({
      id: 'scheme-1',
      organizationName: 'Official Department',
      domainIds: ['education-scholarships'],
      sourceUrl: row.source_url,
      applicationDeadline: '2026-12-01',
    })
  })

  it('does not expose rows with unsafe links, missing source facts, or unknown domains', () => {
    expect(toPublicOpportunity({ ...row, source_url: 'http://example.gov.in/notice' }, new Set(['education-scholarships'])))
      .toBeNull()
    expect(toPublicOpportunity({ ...row, source_url: 'https://other.example/notice' }, new Set(['education-scholarships'])))
      .toBeNull()
    expect(toPublicOpportunity({ ...row, application_url: 'https://other.example/apply' }, new Set(['education-scholarships'])))
      .toBeNull()
    expect(toPublicOpportunity({ ...row, source_published_at: null }, new Set(['education-scholarships'])))
      .toBeNull()
    expect(toPublicOpportunity(row, new Set())).toBeNull()
  })

  it('returns JSON errors for invalid domains and non-GET methods', async () => {
    const loadOpportunities = vi.fn()
    const handler = createDiscoveryHandler(loadOpportunities)
    const invalidResponse = responseRecorder()
    await handler({ method: 'GET', url: '/api/discovery/opportunities?domains=../../etc' }, invalidResponse)
    expect(invalidResponse.statusCode).toBe(400)
    expect(JSON.parse(invalidResponse.body)).toEqual({ error: 'invalid_domains' })
    expect(loadOpportunities).not.toHaveBeenCalled()

    const methodResponse = responseRecorder()
    await handler({ method: 'POST', url: '/api/discovery/opportunities' }, methodResponse)
    expect(methodResponse.statusCode).toBe(405)
  })

  it('serves opportunity results as cacheable JSON', async () => {
    const handler = createDiscoveryHandler(vi.fn().mockResolvedValue({ opportunities: [] }))
    const res = responseRecorder()
    await handler({ method: 'GET', url: '/api/discovery/opportunities?domains=education-scholarships' }, res)
    expect(res.statusCode).toBe(200)
    expect(res.headers['Content-Type']).toContain('application/json')
    expect(res.headers['Cache-Control']).toContain('s-maxage=300')
    expect(JSON.parse(res.body)).toEqual({ opportunities: [] })
  })
})
