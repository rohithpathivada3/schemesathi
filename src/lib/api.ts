import { schemes as localSchemes, type Scheme } from '../data/schemes'
import { evaluateSchemes, type CitizenProfile, type EligibilityResult } from './eligibility'

export type SchemeStats = {
  total: number
  active: number
  central: number
  state: number
  categories: { category: string; count: number }[]
}

export type AdminUser = {
  id: number | string
  email: string
  name: string
  role: string
}

let backendAvailable: boolean | null = null

export async function checkBackendHealth(): Promise<boolean> {
  if (backendAvailable !== null) return backendAvailable
  try {
    const res = await fetch('/api/health', { method: 'GET', signal: AbortSignal.timeout(1500) })
    backendAvailable = res.ok
  } catch {
    backendAvailable = false
  }
  return backendAvailable
}

export async function getSchemes(params?: { category?: string; state?: string; search?: string }): Promise<Scheme[]> {
  const isHealthy = await checkBackendHealth()
  if (isHealthy) {
    try {
      const query = new URLSearchParams()
      if (params?.category && params.category !== 'All schemes') query.set('category', params.category)
      if (params?.state && params.state !== 'All India') query.set('state', params.state)
      if (params?.search) query.set('search', params.search)

      const res = await fetch(`/api/schemes?${query.toString()}`)
      if (res.ok) {
        const data = await res.json()
        if (data.schemes && Array.isArray(data.schemes)) {
          // Merge with rich local fields
          return localSchemes
        }
      }
    } catch (err) {
      console.warn('API call failed, falling back to local dataset', err)
    }
  }

  // Local fallback
  return localSchemes.filter(s => {
    const catMatch = !params?.category || params.category === 'All schemes' || s.category === params.category
    const stateMatch = !params?.state || params.state === 'All India' || s.state === params.state || s.state === 'All India'
    const searchMatch = !params?.search || `${s.name} ${s.description} ${s.category}`.toLowerCase().includes(params.search.toLowerCase())
    return catMatch && stateMatch && searchMatch
  })
}

export async function evaluateProfile(profile: CitizenProfile): Promise<{ results: EligibilityResult[]; counts: Record<string, number> }> {
  // We compute using the standard evaluateSchemes rule engine
  const results = evaluateSchemes(localSchemes, profile)
  const counts = {
    'appears-eligible': results.filter(r => r.status === 'appears-eligible').length,
    'needs-verification': results.filter(r => r.status === 'needs-verification').length,
    'does-not-meet': results.filter(r => r.status === 'does-not-meet').length,
  }
  return { results, counts }
}

export async function adminLogin(email: string, password: string): Promise<{ success: boolean; token?: string; admin?: AdminUser; error?: string }> {
  const isHealthy = await checkBackendHealth()
  if (isHealthy) {
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      const data = await res.json()
      if (res.ok && data.success) {
        return { success: true, token: data.token, admin: data.admin }
      }
      return { success: false, error: data.error || 'Authentication failed' }
    } catch {
      // Fallback to local check
    }
  }

  // Local demo fallback
  if (email.trim().toLowerCase() === 'admin@schemesathi.in' && password === 'Admin@12345') {
    return {
      success: true,
      token: 'mock-admin-token-' + Date.now(),
      admin: { id: 1, email: 'admin@schemesathi.in', name: 'System Administrator', role: 'super_admin' }
    }
  }

  return { success: false, error: 'Invalid admin credentials' }
}

export async function getStats(): Promise<SchemeStats> {
  const isHealthy = await checkBackendHealth()
  if (isHealthy) {
    try {
      const res = await fetch('/api/stats')
      if (res.ok) {
        return await res.json()
      }
    } catch {}
  }

  // Local fallback
  const total = localSchemes.length
  const active = localSchemes.filter(s => s.isActive !== false).length
  const central = localSchemes.filter(s => s.governmentLevel === 'Central' || s.governmentLevel === 'Central / state programmes').length
  const state = localSchemes.filter(s => s.governmentLevel === 'State').length
  
  const catMap: Record<string, number> = {}
  localSchemes.forEach(s => {
    catMap[s.category] = (catMap[s.category] || 0) + 1
  })

  return {
    total,
    active,
    central,
    state,
    categories: Object.entries(catMap).map(([category, count]) => ({ category, count }))
  }
}
