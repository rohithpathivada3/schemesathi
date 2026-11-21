import { describe, expect, it } from 'vitest'
import { schemes, type Scheme } from '../data/schemes'
import { evaluateScheme, filterSchemesForProfile } from './eligibility'

const sourceUrl = 'https://pmkisan.gov.in/scheme-rules'
const baseScheme = schemes[0]

function schemeWithVerifiedRules(overrides: Partial<Scheme> = {}): Scheme {
  return {
    ...baseScheme,
    criteriaComplete: true,
    criteria: [
      { field: 'age', operator: 'min', expected: 18, mandatory: true, sourceUrl, verifiedAt: '2026-11-20', explanation: 'Applicant must meet the minimum age.' },
      { field: 'state', operator: 'equals', expected: 'Andhra Pradesh', mandatory: true, sourceUrl, verifiedAt: '2026-11-20', explanation: 'Applicant must live in Andhra Pradesh.' },
    ],
    ...overrides,
  }
}

describe('evaluateScheme', () => {
  it('marks a profile appears eligible only when every complete verified condition matches', () => {
    const result = evaluateScheme(schemeWithVerifiedRules(), { age: 28, state: 'Andhra Pradesh' })
    expect(result.status).toBe('appears-eligible')
    expect(result.matched).toHaveLength(2)
  })

  it('requires verification when a required profile answer is missing', () => {
    const result = evaluateScheme(schemeWithVerifiedRules(), { age: 28 })
    expect(result.status).toBe('needs-verification')
    expect(result.missing).toHaveLength(1)
  })

  it('marks a profile as not meeting criteria when a verified mandatory rule fails', () => {
    const result = evaluateScheme(schemeWithVerifiedRules(), { age: 17, state: 'Andhra Pradesh' })
    expect(result.status).toBe('does-not-meet')
    expect(result.failed).toHaveLength(1)
  })

  it('does not claim appears eligible when the criteria set is not complete', () => {
    const result = evaluateScheme(schemeWithVerifiedRules({ criteriaComplete: false }), { age: 28, state: 'Andhra Pradesh' })
    expect(result.status).toBe('needs-verification')
  })

  it('does not treat a dated criterion from an unrelated host as verified', () => {
    const scheme = schemeWithVerifiedRules({ criteria: [{ field: 'age', operator: 'min', expected: 18, mandatory: true, sourceUrl: 'https://unrelated.example/rules', verifiedAt: '2026-11-20', explanation: 'Applicant must meet the minimum age.' }] })
    const result = evaluateScheme(scheme, { age: 28 })
    expect(result.status).toBe('needs-verification')
    expect(result.unverified).toHaveLength(1)
  })

  it('requires verification for starter records without transcribed official rules', () => {
    const result = evaluateScheme(baseScheme, { age: 28, state: 'Andhra Pradesh', farmer: true })
    expect(result.status).toBe('needs-verification')
  })

  it('filters out schemes with mandatory criteria not met', () => {
    const schemeA = schemeWithVerifiedRules({ criteria: [{ field: 'age', operator: 'min', expected: 18, mandatory: true, sourceUrl, verifiedAt: '2026-11-20', explanation: 'Applicant must meet the minimum age.' }] })
    const schemeB = schemeWithVerifiedRules({ criteria: [{ field: 'state', operator: 'equals', expected: 'Andhra Pradesh', mandatory: true, sourceUrl, verifiedAt: '2026-11-20', explanation: 'Applicant must live in Andhra Pradesh.' }] })
    const profile = { age: 17, state: 'Andhra Pradesh' }

    const result = filterSchemesForProfile([schemeA, schemeB], profile)

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual(expect.objectContaining({ state: expect.anything() }))
  })

  it('filters out schemes with a known mandatory profile mismatch', () => {
    const matchingScheme = schemeWithVerifiedRules()
    const mismatchedProfile = { age: 17, state: 'Andhra Pradesh' }

    expect(filterSchemesForProfile([matchingScheme], mismatchedProfile)).toEqual([])
    expect(filterSchemesForProfile([matchingScheme], { age: 28, state: 'Andhra Pradesh' })).toEqual([matchingScheme])
  })
})
