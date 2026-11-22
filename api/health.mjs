export default function healthHandler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    res.statusCode = 405
    res.end(JSON.stringify({ error: 'method_not_allowed' }))
    return
  }
  res.statusCode = 200
  res.end(JSON.stringify({
    status: 'ok',
    service: 'SchemeSathi Discovery API',
    timestamp: new Date().toISOString(),
  }))
}
