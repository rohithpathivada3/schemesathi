import type { Scheme, SchemeCriterion, SchemeField } from '../data/schemes'

export type CitizenProfile = Partial<Record<SchemeField, string | number | boolean | null>>
export type EligibilityStatus = 'appears-eligible' | 'needs-verification' | 'does-not-meet'

export type EligibilityResult = {
  scheme: Scheme
  status: EligibilityStatus
  matched: SchemeCriterion[]
  failed: SchemeCriterion[]
  missing: SchemeCriterion[]
  unverified: SchemeCriterion[]
}

function matchesCriterion(actual: unknown, criterion: SchemeCriterion): boolean {
  const expected = criterion.expected
  switch (criterion.operator) {
    case 'equals':
      return actual === expected
    case 'oneOf':
      return Array.isArray(expected) && expected.includes(String(actual))
    case 'min':
      return typeof actual === 'number' && typeof expected === 'number' && actual >= expected
    case 'max':
      return typeof actual === 'number' && typeof expected === 'number' && actual <= expected
  }
}

function isOfficiallyVerified(scheme: Scheme, criterion: SchemeCriterion): boolean {
  if (!criterion.verifiedAt || Number.isNaN(Date.parse(criterion.verifiedAt))) return false
  try {
    const source = new URL(criterion.sourceUrl)
    const official = new URL(scheme.officialSourceUrl)
    return source.protocol === 'https:' && (source.hostname === official.hostname || source.hostname.endsWith(`.${official.hostname}`))
  } catch {
    return false
  }
}

export function evaluateScheme(scheme: Scheme, profile: CitizenProfile): EligibilityResult {
  const verified = scheme.criteria.filter((criterion) => isOfficiallyVerified(scheme, criterion))
  const unverified = scheme.criteria.filter((criterion) => !isOfficiallyVerified(scheme, criterion))
  const missing = verified.filter((criterion) => profile[criterion.field] === undefined || profile[criterion.field] === null || profile[criterion.field] === '')
  const assessed = verified.filter((criterion) => !missing.includes(criterion))
  const matched = assessed.filter((criterion) => matchesCriterion(profile[criterion.field], criterion))
  const failed = assessed.filter((criterion) => !matchesCriterion(profile[criterion.field], criterion))

  let status: EligibilityStatus = 'needs-verification'
  if (failed.some((criterion) => criterion.mandatory)) {
    status = 'does-not-meet'
  } else if (scheme.criteriaComplete && verified.length > 0 && unverified.length === 0 && missing.length === 0 && failed.length === 0) {
    status = 'appears-eligible'
  }

  return { scheme, status, matched, failed, missing, unverified }
}

export function evaluateSchemes(schemes: Scheme[], profile: CitizenProfile): EligibilityResult[] {
  return schemes.map((scheme) => evaluateScheme(scheme, profile))
}

export function filterSchemesForProfile(schemes: Scheme[], profile: CitizenProfile): Scheme[] {
  return schemes.filter((scheme) => {
    const verifiedMandatory = scheme.criteria.filter((criterion) =>
      criterion.mandatory && isOfficiallyVerified(scheme, criterion)
    )

    return verifiedMandatory.every((criterion) => {
      const actual = profile[criterion.field]
      if (actual === undefined || actual === null || actual === '') return true
      return matchesCriterion(actual, criterion)
    })
  })
}
