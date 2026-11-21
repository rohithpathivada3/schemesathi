import { describe, expect, it } from 'vitest'
import { categoryForDomain } from './domainMatching'

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
})
