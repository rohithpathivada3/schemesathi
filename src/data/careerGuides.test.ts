import { describe, expect, it } from 'vitest'
import { generateCareerSearchTerms } from './careerGuides'

describe('generateCareerSearchTerms', () => {
  it('changes suggested roles when the selected domain changes', () => {
    const software = generateCareerSearchTerms('Computer Science & IT')
    const agriculture = generateCareerSearchTerms('Agriculture')
    expect(software[0]).toContain('software developer')
    expect(agriculture[0]).toContain('agriculture field assistant')
    expect(software).not.toEqual(agriculture)
  })

  it('adapts domain role search phrases to current status', () => {
    expect(generateCareerSearchTerms('Computer Science & IT', 'College student')[0]).toContain('internship')
    expect(generateCareerSearchTerms('Computer Science & IT', 'Looking for work')[0]).toContain('entry-level')
    expect(generateCareerSearchTerms('Computer Science & IT', 'Currently employed')[0]).toContain('Experienced')
  })

  it('uses the selected qualification even when the status is the same', () => {
    const iti = generateCareerSearchTerms('Mechanical Engineering', 'College student', 'ITI / trade certificate')[0]
    const graduate = generateCareerSearchTerms('Mechanical Engineering', 'College student', 'Graduate')[0]
    expect(iti).toContain('practical training or internship')
    expect(graduate).toContain('internship')
    expect(iti).not.toEqual(graduate)
  })

  it('uses qualification to suggest apprenticeship/training or graduate trainee searches', () => {
    expect(generateCareerSearchTerms('Mechanical Engineering', '', 'ITI / trade certificate')[0]).toContain('apprenticeship or technician')
    expect(generateCareerSearchTerms('Mechanical Engineering', '', 'Graduate')[0]).toContain('graduate trainee')
  })

  it('returns no made-up guidance for an unknown domain', () => {
    expect(generateCareerSearchTerms('Unknown subject')).toEqual([])
  })
})
