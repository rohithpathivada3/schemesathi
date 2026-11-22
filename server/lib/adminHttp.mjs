import { timingSafeEqual } from 'node:crypto'

export class AdminHttpError extends Error {
  constructor(status, code, details) {
    super(code)
    this.status = status
    this.code = code
    this.details = details
  }
}

export function sendAdminJson(res, status, value) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(value))
}

export function requireAdmin(req, res) {
  const secret = process.env.ADMIN_API_SECRET
  if (!secret || Buffer.byteLength(secret, 'utf8') < 32) {
    sendAdminJson(res, 503, { error: 'admin_not_configured' })
    return false
  }

  const authorization = req.headers?.authorization
  if (typeof authorization !== 'string' || !authorization.startsWith('Bearer ')) {
    sendAdminJson(res, 401, { error: 'unauthorized' })
    return false
  }
  const received = Buffer.from(authorization.slice(7))
  const expected = Buffer.from(secret)
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
    sendAdminJson(res, 401, { error: 'unauthorized' })
    return false
  }
  return true
}

export async function readAdminJsonBody(req) {
  if (req.body !== undefined) {
    const body = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : req.body
    if (typeof body === 'string') {
      if (Buffer.byteLength(body, 'utf8') > 64 * 1024) {
        throw new AdminHttpError(413, 'payload_too_large')
      }
      try {
        const parsed = JSON.parse(body)
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed
      } catch {
        throw new AdminHttpError(400, 'invalid_json')
      }
      throw new AdminHttpError(400, 'invalid_json')
    }
    if (body && typeof body === 'object' && !Array.isArray(body)) return body
    throw new AdminHttpError(400, 'invalid_json')
  }

  let text = ''
  for await (const chunk of req) {
    text += chunk.toString()
    if (Buffer.byteLength(text, 'utf8') > 64 * 1024) {
      throw new AdminHttpError(413, 'payload_too_large')
    }
  }
  if (!text) throw new AdminHttpError(400, 'invalid_json')
  try {
    const parsed = JSON.parse(text)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed
  } catch {
    throw new AdminHttpError(400, 'invalid_json')
  }
  throw new AdminHttpError(400, 'invalid_json')
}

export function sendAdminError(res, error) {
  if (error instanceof AdminHttpError) {
    sendAdminJson(res, error.status, {
      error: error.code,
      ...(error.details ? { details: error.details } : {}),
    })
    return
  }
  if (error instanceof Error &&
    error.message.includes('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')) {
    sendAdminJson(res, 503, { error: 'admin_data_not_configured' })
    return
  }
  console.error('Admin API request failed')
  sendAdminJson(res, 500, { error: 'admin_request_failed' })
}
