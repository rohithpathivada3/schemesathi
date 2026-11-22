import { describe, expect, it, vi } from 'vitest'
import { getDiscoveryNotifications } from './discoveryNotifications'

describe('discovery notification client', () => {
  it('requests notices after a cursor and validates official links', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      notifications: [{
        id: 'notice-1',
        categoryId: 'education-scholarships',
        createdAt: '2026-11-22T00:00:00.000Z',
        title: 'New student grant',
        sourceUrl: 'https://example.gov.in/notice',
      }],
    }), { status: 200, headers: { 'content-type': 'application/json' } }))

    await expect(getDiscoveryNotifications('2026-11-21T00:00:00.000Z', fetchImpl))
      .resolves.toMatchObject([{ id: 'notice-1', title: 'New student grant' }])
    expect(fetchImpl.mock.calls[0][0]).toContain('since=2026-11-21T00%3A00%3A00.000Z')
  })

  it('rejects insecure, malformed, and unconfigured notification responses', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      notifications: [{
        id: 'notice-1',
        categoryId: 'education-scholarships',
        createdAt: '2026-11-22T00:00:00.000Z',
        title: 'New student grant',
        sourceUrl: 'http://example.gov.in/notice',
      }],
    }), { status: 200, headers: { 'content-type': 'application/json' } }))
    await expect(getDiscoveryNotifications('2026-11-21T00:00:00.000Z', fetchImpl))
      .rejects.toThrow('invalid-response')

    fetchImpl.mockResolvedValue(new Response('{}', { status: 503 }))
    await expect(getDiscoveryNotifications('2026-11-21T00:00:00.000Z', fetchImpl))
      .rejects.toThrow('not-configured')
  })
})
