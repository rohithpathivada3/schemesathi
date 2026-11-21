import http from 'node:http'
import url from 'node:url'
import { getDatabase } from './db/database.mjs'
import { hashPassword, seedDatabase } from './db/seed.mjs'

// Ensure DB is initialized and seeded
seedDatabase()

const PORT = process.env.PORT || 5000

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
}

function sendJson(res, statusCode, data) {
  setCorsHeaders(res)
  res.writeHead(statusCode, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(data))
}

function sendError(res, statusCode, message) {
  sendJson(res, statusCode, { error: message })
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', chunk => {
      body += chunk.toString()
      if (body.length > 2 * 1024 * 1024) {
        reject(new Error('Payload too large'))
      }
    })
    req.on('end', () => {
      if (!body) return resolve({})
      try {
        resolve(JSON.parse(body))
      } catch (err) {
        reject(new Error('Invalid JSON'))
      }
    })
    req.on('error', reject)
  })
}

// Rule matching function in backend
function matchesCriterion(actual, operator, expected) {
  switch (operator) {
    case 'equals':
      return actual === expected
    case 'oneOf':
      return Array.isArray(expected) && expected.includes(String(actual))
    case 'min':
      return typeof actual === 'number' && typeof expected === 'number' && actual >= expected
    case 'max':
      return typeof actual === 'number' && typeof expected === 'number' && actual <= expected
    default:
      return false
  }
}

function isOfficiallyVerified(officialUrl, criterionUrl, verifiedAt) {
  if (!verifiedAt || Number.isNaN(Date.parse(verifiedAt))) return false
  try {
    const source = new URL(criterionUrl)
    const official = new URL(officialUrl)
    return source.protocol === 'https:' && (source.hostname === official.hostname || source.hostname.endsWith(`.${official.hostname}`))
  } catch {
    return false
  }
}

function evaluateSchemeRecord(scheme, criteria, profile) {
  const verified = criteria.filter(c => isOfficiallyVerified(scheme.official_source_url, c.source_url, c.verified_at))
  const unverified = criteria.filter(c => !isOfficiallyVerified(scheme.official_source_url, c.source_url, c.verified_at))
  
  const missing = verified.filter(c => profile[c.field] === undefined || profile[c.field] === null || profile[c.field] === '')
  const assessed = verified.filter(c => !missing.includes(c))
  
  const matched = assessed.filter(c => {
    let expected = c.expected_value
    try {
      expected = JSON.parse(c.expected_value)
    } catch {
      // already string/scalar
    }
    return matchesCriterion(profile[c.field], c.operator, expected)
  })
  
  const failed = assessed.filter(c => {
    let expected = c.expected_value
    try {
      expected = JSON.parse(c.expected_value)
    } catch {}
    return !matchesCriterion(profile[c.field], c.operator, expected)
  })

  let status = 'needs-verification'
  if (failed.some(c => c.mandatory === 1)) {
    status = 'does-not-meet'
  } else if (scheme.criteria_complete === 1 && verified.length > 0 && unverified.length === 0 && missing.length === 0 && failed.length === 0) {
    status = 'appears-eligible'
  }

  return {
    schemeId: scheme.id,
    schemeName: scheme.name,
    status,
    matched: matched.map(m => ({ field: m.field, explanation: m.explanation })),
    failed: failed.map(f => ({ field: f.field, explanation: f.explanation, mandatory: f.mandatory === 1 })),
    missing: missing.map(m => ({ field: m.field, explanation: m.explanation })),
    unverified: unverified.map(u => ({ field: u.field, explanation: u.explanation }))
  }
}

const server = http.createServer(async (req, res) => {
  setCorsHeaders(res)

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost:5000'}`)
  const pathname = reqUrl.pathname
  const queryParams = Object.fromEntries(reqUrl.searchParams.entries())
  const db = getDatabase()

  try {
    // Health check
    if (pathname === '/api/health' && req.method === 'GET') {
      return sendJson(res, 200, { status: 'ok', service: 'SchemeSathi Backend API', timestamp: new Date().toISOString() })
    }

    // Scheme stats
    if (pathname === '/api/stats' && req.method === 'GET') {
      const totalRow = db.prepare('SELECT COUNT(*) as count FROM schemes').get()
      const activeRow = db.prepare('SELECT COUNT(*) as count FROM schemes WHERE is_active = 1').get()
      const centralRow = db.prepare("SELECT COUNT(*) as count FROM schemes WHERE government_level = 'Central'").get()
      const stateRow = db.prepare("SELECT COUNT(*) as count FROM schemes WHERE government_level = 'State'").get()
      const categories = db.prepare('SELECT category, COUNT(*) as count FROM schemes GROUP BY category').all()

      return sendJson(res, 200, {
        total: totalRow.count,
        active: activeRow.count,
        central: centralRow.count,
        state: stateRow.count,
        categories
      })
    }

    // Get all schemes
    if (pathname === '/api/schemes' && req.method === 'GET') {
      const { category, state, search } = queryParams
      let query = 'SELECT * FROM schemes WHERE is_active = 1'
      const params = []

      if (category && category !== 'All schemes' && category !== 'all') {
        query += ' AND category = ?'
        params.push(category)
      }
      if (state && state !== 'All India' && state !== 'all') {
        query += ' AND (state = ? OR state = "All India")'
        params.push(state)
      }
      if (search) {
        query += ' AND (name LIKE ? OR description LIKE ? OR department LIKE ?)'
        const wild = `%${search}%`
        params.push(wild, wild, wild)
      }

      query += ' ORDER BY created_at DESC'
      const schemesList = db.prepare(query).all(...params)
      return sendJson(res, 200, { schemes: schemesList })
    }

    // Single scheme details with criteria, documents, steps
    if (pathname.startsWith('/api/schemes/') && req.method === 'GET') {
      const schemeId = pathname.replace('/api/schemes/', '')
      const scheme = db.prepare('SELECT * FROM schemes WHERE id = ?').get(schemeId)
      if (!scheme) {
        return sendError(res, 404, 'Scheme not found')
      }

      const criteria = db.prepare('SELECT * FROM criteria WHERE scheme_id = ?').all(schemeId)
      const documents = db.prepare('SELECT * FROM required_documents WHERE scheme_id = ?').all(schemeId)
      const steps = db.prepare('SELECT * FROM application_steps WHERE scheme_id = ? ORDER BY step_number ASC').all(schemeId)

      return sendJson(res, 200, {
        scheme,
        criteria,
        documents,
        steps
      })
    }

    // Evaluate eligibility
    if (pathname === '/api/eligibility/evaluate' && req.method === 'POST') {
      const body = await parseBody(req)
      const profile = body.profile || {}

      const allActiveSchemes = db.prepare('SELECT * FROM schemes WHERE is_active = 1').all()
      const allCriteria = db.prepare('SELECT * FROM criteria').all()

      const criteriaByScheme = {}
      for (const c of allCriteria) {
        if (!criteriaByScheme[c.scheme_id]) criteriaByScheme[c.scheme_id] = []
        criteriaByScheme[c.scheme_id].push(c)
      }

      const results = allActiveSchemes.map(scheme => {
        const criteria = criteriaByScheme[scheme.id] || []
        const evalResult = evaluateSchemeRecord(scheme, criteria, profile)
        return {
          scheme,
          ...evalResult
        }
      })

      const counts = {
        'appears-eligible': results.filter(r => r.status === 'appears-eligible').length,
        'needs-verification': results.filter(r => r.status === 'needs-verification').length,
        'does-not-meet': results.filter(r => r.status === 'does-not-meet').length
      }

      return sendJson(res, 200, { results, counts })
    }

    // Admin Login
    if (pathname === '/api/admin/login' && req.method === 'POST') {
      const { email, password } = await parseBody(req)
      if (!email || !password) {
        return sendError(res, 400, 'Email and password required')
      }

      const hash = hashPassword(password)
      const admin = db.prepare('SELECT id, email, name, role FROM admin_users WHERE email = ? AND password_hash = ?').get(email.trim(), hash)

      if (!admin) {
        return sendError(res, 401, 'Invalid admin email or password')
      }

      const token = Buffer.from(`${admin.id}:${Date.now()}:${admin.email}`).toString('base64')
      return sendJson(res, 200, {
        success: true,
        token,
        admin
      })
    }

    // Admin Add Scheme
    if (pathname === '/api/admin/schemes' && req.method === 'POST') {
      const data = await parseBody(req)
      if (!data.id || !data.name || !data.department || !data.category) {
        return sendError(res, 400, 'Missing required scheme fields')
      }

      db.prepare(`
        INSERT INTO schemes (
          id, name, name_te, government_level, department, department_te,
          description, description_te, purpose, benefit, benefit_te,
          category, state, helpline, deadline, official_url, official_source_url,
          source_reference, last_verified, criteria_complete, is_active, color, symbol
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        data.id, data.name, data.name_te || null, data.government_level || 'Central',
        data.department, data.department_te || null, data.description || '', data.description_te || null,
        data.purpose || null, data.benefit || null, data.benefit_te || null,
        data.category, data.state || 'All India', data.helpline || null, data.deadline || null,
        data.official_url || '', data.official_source_url || data.official_url || '',
        data.source_reference || 'Official Guidelines', data.last_verified || new Date().toISOString().split('T')[0],
        data.criteria_complete ?? 1, data.is_active ?? 1, data.color || 'blue', data.symbol || '📋'
      )

      return sendJson(res, 201, { success: true, id: data.id, message: 'Scheme created successfully' })
    }

    // Admin Edit Scheme
    if (pathname.startsWith('/api/admin/schemes/') && req.method === 'PUT') {
      const schemeId = pathname.replace('/api/admin/schemes/', '')
      const data = await parseBody(req)

      db.prepare(`
        UPDATE schemes SET
          name = COALESCE(?, name),
          department = COALESCE(?, department),
          description = COALESCE(?, description),
          benefit = COALESCE(?, benefit),
          category = COALESCE(?, category),
          state = COALESCE(?, state),
          helpline = COALESCE(?, helpline),
          official_url = COALESCE(?, official_url),
          last_verified = COALESCE(?, last_verified),
          is_active = COALESCE(?, is_active),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        data.name, data.department, data.description, data.benefit,
        data.category, data.state, data.helpline, data.official_url,
        data.last_verified, data.is_active, schemeId
      )

      return sendJson(res, 200, { success: true, message: 'Scheme updated successfully' })
    }

    // Admin Delete Scheme
    if (pathname.startsWith('/api/admin/schemes/') && req.method === 'DELETE') {
      const schemeId = pathname.replace('/api/admin/schemes/', '')
      db.prepare('DELETE FROM schemes WHERE id = ?').run(schemeId)
      return sendJson(res, 200, { success: true, message: 'Scheme deleted' })
    }

    // Admin Toggle Scheme Status
    if (pathname.startsWith('/api/admin/schemes/') && pathname.endsWith('/status') && req.method === 'PATCH') {
      const schemeId = pathname.replace('/api/admin/schemes/', '').replace('/status', '')
      const scheme = db.prepare('SELECT is_active FROM schemes WHERE id = ?').get(schemeId)
      if (!scheme) return sendError(res, 404, 'Scheme not found')

      const newStatus = scheme.is_active === 1 ? 0 : 1
      db.prepare('UPDATE schemes SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newStatus, schemeId)

      return sendJson(res, 200, { success: true, is_active: newStatus })
    }

    // 404 Not Found
    return sendError(res, 404, 'Endpoint not found')

  } catch (error) {
    console.error('Server error:', error)
    return sendError(res, 500, error.message || 'Internal server error')
  }
})

server.listen(PORT, () => {
  console.log(`SchemeSathi Server running on http://localhost:${PORT}`)
})
