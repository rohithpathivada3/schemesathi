import { describe, expect, it } from 'vitest'
import { schemes } from '../data/schemes'
import { evaluateScheme, evaluateSchemes } from './eligibility'
import { translations } from '../data/translations'

describe('SchemeSathi Full System Test Suite', () => {
  it('correctly matches an Andhra Pradesh farmer for AP Rythu Bharosa (Category A - Appears Eligible)', () => {
    const rythuBharosa = schemes.find((s) => s.id === 'ap-rythu-bharosa')
    expect(rythuBharosa).toBeDefined()

    const result = evaluateScheme(rythuBharosa!, {
      state: 'Andhra Pradesh',
      farmer: true,
      age: 42,
    })

    expect(result.status).toBe('appears-eligible')
    expect(result.matched.length).toBeGreaterThanOrEqual(2)
    expect(result.failed).toHaveLength(0)
  })

  it('rejects an applicant from Telangana or non-AP for AP Rythu Bharosa (Category C - Not Eligible)', () => {
    const rythuBharosa = schemes.find((s) => s.id === 'ap-rythu-bharosa')
    expect(rythuBharosa).toBeDefined()

    const result = evaluateScheme(rythuBharosa!, {
      state: 'Telangana',
      farmer: true,
    })

    expect(result.status).toBe('does-not-meet')
    expect(result.failed.some((f) => f.field === 'state')).toBe(true)
  })

  it('requires verification when farmer status is missing (Category B - Needs Verification)', () => {
    const rythuBharosa = schemes.find((s) => s.id === 'ap-rythu-bharosa')
    expect(rythuBharosa).toBeDefined()

    const result = evaluateScheme(rythuBharosa!, {
      state: 'Andhra Pradesh',
    })

    expect(result.status).toBe('needs-verification')
    expect(result.missing.some((m) => m.field === 'farmer')).toBe(true)
  })

  it('correctly evaluates Atal Pension Yojana (APY) for age between 18 and 40', () => {
    const apy = schemes.find((s) => s.id === 'apy')
    expect(apy).toBeDefined()

    // 25 year old -> Appears eligible
    const eligibleResult = evaluateScheme(apy!, { age: 25 })
    expect(eligibleResult.status).toBe('appears-eligible')

    // 45 year old -> Exceeds max age of 40 -> Does not meet
    const overageResult = evaluateScheme(apy!, { age: 45 })
    expect(overageResult.status).toBe('does-not-meet')

    // 16 year old -> Under min age of 18 -> Does not meet
    const underageResult = evaluateScheme(apy!, { age: 16 })
    expect(underageResult.status).toBe('does-not-meet')
  })

  it('correctly evaluates YSR Cheyutha for an eligible 50-year-old SC woman in Andhra Pradesh', () => {
    const cheyutha = schemes.find((s) => s.id === 'ap-cheyutha')
    expect(cheyutha).toBeDefined()

    const result = evaluateScheme(cheyutha!, {
      state: 'Andhra Pradesh',
      gender: 'Woman',
      age: 50,
      socialCategory: 'SC',
    })

    expect(result.status).toBe('appears-eligible')
  })

  it('rejects YSR Cheyutha for a man or woman outside age 45-60', () => {
    const cheyutha = schemes.find((s) => s.id === 'ap-cheyutha')
    expect(cheyutha).toBeDefined()

    // Man applying -> fails gender criterion
    const manResult = evaluateScheme(cheyutha!, {
      state: 'Andhra Pradesh',
      gender: 'Man',
      age: 50,
      socialCategory: 'SC',
    })
    expect(manResult.status).toBe('does-not-meet')

    // 35-year-old woman -> fails minimum age of 45
    const youngWomanResult = evaluateScheme(cheyutha!, {
      state: 'Andhra Pradesh',
      gender: 'Woman',
      age: 35,
      socialCategory: 'SC',
    })
    expect(youngWomanResult.status).toBe('does-not-meet')
  })

  it('evaluates batch schemes with category counts accurately', () => {
    const profile = {
      state: 'Andhra Pradesh',
      farmer: true,
      age: 32,
      bpl: true,
    }

    const results = evaluateSchemes(schemes, profile)
    expect(results.length).toBe(schemes.length)

    const eligible = results.filter((r) => r.status === 'appears-eligible')
    const needsVerification = results.filter((r) => r.status === 'needs-verification')
    const doesNotMeet = results.filter((r) => r.status === 'does-not-meet')

    expect(eligible.length).toBeGreaterThan(0)
    expect(needsVerification.length + doesNotMeet.length).toBeGreaterThan(0)
  })

  it('contains complete English and Telugu translation keys', () => {
    expect(translations.en.appName).toBe('SchemeSathi')
    expect(translations.te.appName).toContain('స్కీమ్‌సాథి')
    expect(translations.en.catA).toContain('Category A')
    expect(translations.te.catA).toContain('వర్గం A')
    expect(translations.en.startCheckBtn).toBeDefined()
    expect(translations.te.startCheckBtn).toBeDefined()
  })
})
