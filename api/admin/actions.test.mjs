import { afterEach, describe, expect, it, vi } from 'vitest'
import adminActionsHandler from './actions.mjs'

const adminSecret = 'a'.repeat(40)

function responseRecorder() {
  return {
    headers: {},
    setHeader(name, value) { this.headers[name] = value },
    end(value) { this.body = value },
  }
}

describe('admin action access control', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('rejects missing credentials and invalid actions before any database access', async () => {
    vi.stubEnv('ADMIN_API_SECRET', adminSecret)
    const fetchImpl = vi.fn()
    vi.stubGlobal('fetch', fetchImpl)
    const unauthorized = responseRecorder()
    await adminActionsHandler({ method: 'POST', headers: {}, body: { action: 'source.create' } }, unauthorized)
    expect(unauthorized.statusCode).toBe(401)

    const invalid = responseRecorder()
    await adminActionsHandler({
      method: 'POST',
      headers: { authorization: `Bearer ${adminSecret}` },
      body: { action: 'unknown.action' },
    }, invalid)
    expect(invalid.statusCode).toBe(400)
    expect(JSON.parse(invalid.body)).toEqual({ error: 'invalid_action' })
    expect(fetchImpl).not.toHaveBeenCalled()
  })
})
