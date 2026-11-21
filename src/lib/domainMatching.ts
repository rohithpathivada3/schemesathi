export type SchemeCategory = 'Agriculture' | 'Health' | 'Education' | 'Business' | 'Pension' | 'Housing & energy'

const fieldCategories: Record<string, SchemeCategory> = {
  'Computer Science & IT': 'Business',
  'Mechanical Engineering': 'Business',
  'Electrical & Electronics': 'Housing & energy',
  'Civil Engineering': 'Housing & energy',
  'Chemical Engineering': 'Business',
  'Business & Commerce': 'Business',
  'Arts & Humanities': 'Education',
  'Science & Research': 'Education',
  'Healthcare & Life Sciences': 'Health',
  'Agriculture': 'Agriculture',
  'Skilled trades & vocational': 'Business',
  'Design & Media': 'Business',
  'Other / exploring': 'Education',
}

const occupationCategories: Record<string, SchemeCategory> = {
  Farmer: 'Agriculture',
  Artisan: 'Business',
  'Daily wage worker': 'Pension',
  'Self-employed': 'Business',
  Student: 'Education',
}

export function categoryForDomain(fieldOfStudy = '', occupation = 'Any occupation'): SchemeCategory | null {
  if (fieldOfStudy && fieldCategories[fieldOfStudy]) return fieldCategories[fieldOfStudy]
  if (occupation !== 'Any occupation' && occupationCategories[occupation]) return occupationCategories[occupation]
  return null
}
