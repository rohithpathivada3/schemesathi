import { describe, expect, it, vi } from 'vitest'
import { getLiveOpportunities } from './discovery'

const opportunity = {
  id: 'public-1',
  title: 'Student grant',
  organizationName: 'Example Ministry',
  sector: 'government',
  domainIds: ['education-scholarships'],
  description: 'A source-backed announcement.',
  benefits: ['Financial support'],
  eligibility: ['Students enrolled in an eligible program'],
  requiredDocuments: ['Proof of enrollment'],
  sourceUrl: 'https://example.gov.in/notice/1',
  sourcePublishedAt: '2026-11-20',
  applicationUrl: null,
  applicationStartDate: null,
  applicationDeadline: null,
  applicationStatus: 'new',
  lastVerifiedAt: '2026-11-21T00:00:00.000Z',
}

describe('getLiveOpportunities', () => {
  it('sends only selected public domains and validates returned opportunities', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ opportunities: [opportunity] }),
      { status: 200, headers: { 'content-type': 'application/json' } }
    ))

    await expect(getLiveOpportunities(['education-scholarships'], fetchImpl))
      .resolves.toEqual([opportunity])
    expect(fetchImpl.mock.calls[0][0]).toBe(
      '/api/discovery/opportunities?domains=education-scholarships'
    )
  })

  it('rejects unsafe links and non-JSON SPA fallbacks instead of displaying them as live data', async () => {
    const unsafeOpportunity = { ...opportunity, sourceUrl: 'javascript:alert(1)' }
    await expect(getLiveOpportunities([], vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ opportunities: [unsafeOpportunity] }),
      { status: 200, headers: { 'content-type': 'application/json' } }
    )))).rejects.toThrow('invalid-response')

    await expect(getLiveOpportunities([], vi.fn().mockResolvedValue(new Response(
      '<!doctype html>', { status: 200, headers: { 'content-type': 'text/html' } }
    )))).rejects.toThrow('not-configured')
  })

  it('rejects malformed dates without throwing while validating a response', async () => {
    const invalidDate = { ...opportunity, sourcePublishedAt: '2026-02-31' }
    await expect(getLiveOpportunities([], vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ opportunities: [invalidDate] }),
      { status: 200, headers: { 'content-type': 'application/json' } }
    )))).rejects.toThrow('invalid-response')
  })

  it('reports an unconfigured service without falling back to static schemes', async () => {
    await expect(getLiveOpportunities([], vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ error: 'Supabase is not configured' }),
      { status: 503, headers: { 'content-type': 'application/json' } }
    )))).rejects.toThrow('not-configured')
  })
})
