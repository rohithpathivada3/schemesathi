import { describe, expect, it, vi } from 'vitest'
import { createNotificationsHandler } from './notifications.mjs'

function responseRecorder() {
  return {
    headers: {},
    setHeader(name, value) { this.headers[name] = value },
    end(value) { this.body = value },
  }
}

describe('public notification API', () => {
  it('accepts a recent cursor and returns cache-disabled JSON', async () => {
    const loadNotifications = vi.fn().mockResolvedValue([])
    const handler = createNotificationsHandler(loadNotifications)
    const since = new Date(Date.now() - 60_000).toISOString()
    const res = responseRecorder()
    await handler({ method: 'GET', url: `/api/discovery/notifications?since=${encodeURIComponent(since)}` }, res)

    expect(res.statusCode).toBe(200)
    expect(res.headers['Cache-Control']).toBe('no-store')
    expect(JSON.parse(res.body)).toEqual({ notifications: [] })
    expect(loadNotifications).toHaveBeenCalledOnce()
  })

  it('rejects invalid cursors and methods before accessing the database', async () => {
    const loadNotifications = vi.fn()
    const handler = createNotificationsHandler(loadNotifications)
    const invalidResponse = responseRecorder()
    await handler({ method: 'GET', url: '/api/discovery/notifications?since=invalid' }, invalidResponse)
    expect(invalidResponse.statusCode).toBe(400)

    const methodResponse = responseRecorder()
    await handler({ method: 'POST', url: '/api/discovery/notifications' }, methodResponse)
    expect(methodResponse.statusCode).toBe(405)
    expect(loadNotifications).not.toHaveBeenCalled()
  })
})
