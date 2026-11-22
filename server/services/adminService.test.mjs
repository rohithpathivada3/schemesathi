import { afterEach, describe, expect, it, vi } from 'vitest'
import { executeAdminAction } from './adminService.mjs'

const organizationId = 'c65b8ec0-67a0-4b19-8f4e-433e657a56dd'

describe('protected source administration', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('creates sources pending and disabled even when an organization is unverified', async () => {
    vi.stubEnv('SUPABASE_URL', 'https://project.supabase.co')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify([{
        id: organizationId,
        official_domain: 'example.gov.in',
        verified_at: null,
      }]), { status: 200, headers: { 'content-type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify([{ id: 'education-scholarships' }]), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify([{
        id: 'e18be5fb-e7f7-41bf-9947-bc9321e5227e',
        trust_status: 'pending',
        is_enabled: false,
      }]), { status: 201, headers: { 'content-type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchImpl)

    await executeAdminAction({
      action: 'source.create',
      name: 'Official scholarship feed',
      organizationId,
      sourceType: 'rss',
      sourceUrl: 'https://example.gov.in/announcements.xml',
      authorizedDomain: 'example.gov.in',
      domainIds: ['education-scholarships'],
      parserConfig: {},
    })

    const inserted = JSON.parse(fetchImpl.mock.calls[2][1].body)
    expect(inserted).toMatchObject({
      trust_status: 'pending',
      is_enabled: false,
      source_type: 'rss',
      organization_id: organizationId,
    })
  })

  it('rejects unapproved domains and requires an explicit official-source confirmation', async () => {
    vi.stubEnv('SUPABASE_URL', 'https://project.supabase.co')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify([{
      id: organizationId,
      official_domain: 'example.gov.in',
      verified_at: null,
    }]), { status: 200, headers: { 'content-type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchImpl)

    await expect(executeAdminAction({
      action: 'source.create',
      name: 'Untrusted feed',
      organizationId,
      sourceType: 'rss',
      sourceUrl: 'https://outside.example/feed.xml',
      authorizedDomain: 'example.gov.in',
      domainIds: ['education-scholarships'],
    })).rejects.toMatchObject({ status: 400, code: 'invalid_source_url' })

    await expect(executeAdminAction({
      action: 'organization.verify',
      id: organizationId,
      confirmOfficial: false,
    })).rejects.toMatchObject({ status: 400, code: 'official_verification_required' })
    expect(fetchImpl).toHaveBeenCalledOnce()
  })
})
