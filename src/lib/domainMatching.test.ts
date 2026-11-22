import { describe, expect, it } from 'vitest'
import { categoryForDomain, getSchemeDomainIds, schemeMatchesDomains } from './domainMatching'

describe('categoryForDomain', () => {
  it('returns a matching scheme category for a selected field', () => {
    expect(categoryForDomain('Agriculture')).toBe('Agriculture')
    expect(categoryForDomain('Healthcare & Life Sciences')).toBe('Health')
    expect(categoryForDomain('Computer Science & IT')).toBe('Business')
  })

  it('falls back to occupation when no field is selected', () => {
    expect(categoryForDomain('', 'Farmer')).toBe('Agriculture')
    expect(categoryForDomain('', 'Student')).toBe('Education')
  })

  it('returns all schemes only when no domain or occupation is selected', () => {
    expect(categoryForDomain('', 'Any occupation')).toBeNull()
  })

  it('maps current scheme categories and tags to one or more discovery domains', () => {
    expect(getSchemeDomainIds({
      category: 'Agriculture',
      tags: ['Farmers', 'Income Support'],
    })).toContain('agriculture-farmers')
    expect(getSchemeDomainIds({
      category: 'Education',
      tags: ['Women', 'Students'],
    })).toEqual(['education-scholarships', 'women-child-welfare'])
  })

  it('matches any selected domain and treats an empty selection as all domains', () => {
    const scheme = { category: 'Health', tags: ['Healthcare'] }
    expect(schemeMatchesDomains(scheme, ['health-medical'])).toBe(true)
    expect(schemeMatchesDomains(scheme, ['education-scholarships'])).toBe(false)
    expect(schemeMatchesDomains(scheme, [])).toBe(true)
  })
})
