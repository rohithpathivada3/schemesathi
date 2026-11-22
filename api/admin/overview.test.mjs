import { afterEach, describe, expect, it, vi } from 'vitest'
import adminOverviewHandler from './overview.mjs'

const adminSecret = 'a'.repeat(40)

function responseRecorder() {
  return {
    headers: {},
    setHeader(name, value) { this.headers[name] = value },
    end(value) { this.body = value },
  }
}

describe('admin overview access control', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('requires configured admin credentials before loading protected data', async () => {
    vi.stubEnv('ADMIN_API_SECRET', '')
    const fetchImpl = vi.fn()
    vi.stubGlobal('fetch', fetchImpl)
    const res = responseRecorder()
    await adminOverviewHandler({ method: 'GET', headers: {} }, res)
    expect(res.statusCode).toBe(503)
    expect(JSON.parse(res.body)).toEqual({ error: 'admin_not_configured' })
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('rejects unauthorized and unsupported requests', async () => {
    vi.stubEnv('ADMIN_API_SECRET', adminSecret)
    const unauthorized = responseRecorder()
    await adminOverviewHandler({ method: 'GET', headers: { authorization: 'Bearer wrong' } }, unauthorized)
    expect(unauthorized.statusCode).toBe(401)

    const unsupported = responseRecorder()
    await adminOverviewHandler({
      method: 'POST',
      headers: { authorization: `Bearer ${adminSecret}` },
    }, unsupported)
    expect(unsupported.statusCode).toBe(405)
  })
})
