import { afterEach, describe, expect, it, vi } from 'vitest'
import { createSupabaseSchemeRepository } from './supabaseSchemeRepository.mjs'

describe('new scheme notification persistence', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('creates one public notice for each verified domain without profile data', async () => {
    vi.stubEnv('SUPABASE_URL', 'https://project.supabase.co')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(new Response('[]', {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchImpl)

    await createSupabaseSchemeRepository().recordNewSchemeNotification(
      'scheme-1',
      ['education-scholarships', 'jobs-employment', 'education-scholarships'],
      { title: 'Student grant', sourceUrl: 'https://example.gov.in/notice' },
    )

    expect(fetchImpl).toHaveBeenCalledTimes(2)
    const inserted = JSON.parse(fetchImpl.mock.calls[1][1].body)
    expect(inserted).toEqual([
      {
        scheme_id: 'scheme-1',
        category_id: 'education-scholarships',
        event_type: 'new_scheme',
        payload: { title: 'Student grant', sourceUrl: 'https://example.gov.in/notice' },
      },
      {
        scheme_id: 'scheme-1',
        category_id: 'jobs-employment',
        event_type: 'new_scheme',
        payload: { title: 'Student grant', sourceUrl: 'https://example.gov.in/notice' },
      },
    ])
  })

  it('does not reinsert an already recorded new-scheme notice', async () => {
    vi.stubEnv('SUPABASE_URL', 'https://project.supabase.co')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
    const fetchImpl = vi.fn().mockResolvedValue(new Response('[{"id":"notice-1"}]', {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }))
    vi.stubGlobal('fetch', fetchImpl)

    await createSupabaseSchemeRepository().recordNewSchemeNotification(
      'scheme-1',
      ['education-scholarships'],
      { title: 'Student grant', sourceUrl: 'https://example.gov.in/notice' },
    )

    expect(fetchImpl).toHaveBeenCalledOnce()
  })
})
