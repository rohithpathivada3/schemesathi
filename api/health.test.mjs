import { describe, expect, it } from 'vitest'
import healthHandler from './health.mjs'

function responseRecorder() {
  return {
    headers: {},
    setHeader(name, value) { this.headers[name] = value },
    end(value) { this.body = value },
  }
}

describe('deployed health endpoint', () => {
  it('returns a no-store JSON health response', () => {
    const res = responseRecorder()
    healthHandler({ method: 'GET' }, res)
    expect(res.statusCode).toBe(200)
    expect(res.headers['Content-Type']).toContain('application/json')
    expect(res.headers['Cache-Control']).toBe('no-store')
    expect(JSON.parse(res.body)).toMatchObject({
      status: 'ok',
      service: 'SchemeSathi Discovery API',
    })
  })

  it('rejects unsupported methods', () => {
    const res = responseRecorder()
    healthHandler({ method: 'POST' }, res)
    expect(res.statusCode).toBe(405)
    expect(res.headers.Allow).toBe('GET')
  })
})
