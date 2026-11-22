import { afterEach, describe, expect, it, vi } from 'vitest'
import { createSyncHandler } from './sync.mjs'

const cronSecret = 'c'.repeat(40)

function responseRecorder() {
  return {
    headers: {},
    setHeader(name, value) { this.headers[name] = value },
    end(value) { this.body = value },
  }
}

describe('synchronization endpoint authorization', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('requires a configured cron secret and rejects unauthorized requests', async () => {
    vi.stubEnv('CRON_SECRET', '')
    const handler = createSyncHandler(vi.fn())
    const missingResponse = responseRecorder()
    await handler({ method: 'GET', headers: {} }, missingResponse)
    expect(missingResponse.statusCode).toBe(503)
    expect(JSON.parse(missingResponse.body)).toEqual({ error: 'cron_not_configured' })

    vi.stubEnv('CRON_SECRET', cronSecret)
    const unauthorizedResponse = responseRecorder()
    await handler({ method: 'GET', headers: { authorization: 'Bearer wrong' } }, unauthorizedResponse)
    expect(unauthorizedResponse.statusCode).toBe(401)
  })

  it('runs only after bearer authorization succeeds', async () => {
    vi.stubEnv('CRON_SECRET', cronSecret)
    const sync = vi.fn().mockResolvedValue({ sourcesAttempted: 0 })
    const handler = createSyncHandler(sync)
    const res = responseRecorder()
    await handler({ method: 'POST', headers: { authorization: `Bearer ${cronSecret}` } }, res)
    expect(sync).toHaveBeenCalledOnce()
    expect(res.statusCode).toBe(200)
    expect(res.headers['Cache-Control']).toBe('no-store')
  })
})
