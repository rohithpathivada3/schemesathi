export type SchemeCategory = 'Agriculture' | 'Health' | 'Education' | 'Business' | 'Pension' | 'Housing & energy'
export type DiscoveryDomainId =
  | 'education-scholarships'
  | 'jobs-employment'
  | 'agriculture-farmers'
  | 'health-medical'
  | 'business-entrepreneurship'
  | 'women-child-welfare'
  | 'social-welfare-pension'
  | 'housing-basic-needs'
  | 'technology-innovation'
  | 'research-development'
  | 'skill-development-training'
  | 'other-benefits'

export const discoveryDomains: {
  id: DiscoveryDomainId
  label: { en: string; te: string }
}[] = [
  { id: 'education-scholarships', label: { en: 'Education & Scholarships', te: 'విద్య & ఉపకార వేతనాలు' } },
  { id: 'jobs-employment', label: { en: 'Jobs & Employment', te: 'ఉద్యోగాలు & ఉపాధి' } },
  { id: 'agriculture-farmers', label: { en: 'Agriculture & Farmers', te: 'వ్యవసాయం & రైతులు' } },
  { id: 'health-medical', label: { en: 'Health & Medical Assistance', te: 'ఆరోగ్యం & వైద్య సహాయం' } },
  { id: 'business-entrepreneurship', label: { en: 'Business & Entrepreneurship', te: 'వ్యాపారం & పారిశ్రామికత' } },
  { id: 'women-child-welfare', label: { en: 'Women & Child Welfare', te: 'మహిళలు & శిశు సంక్షేమం' } },
  { id: 'social-welfare-pension', label: { en: 'Social Welfare & Pension', te: 'సామాజిక సంక్షేమం & పింఛను' } },
  { id: 'housing-basic-needs', label: { en: 'Housing & Basic Needs', te: 'గృహం & ప్రాథమిక అవసరాలు' } },
  { id: 'technology-innovation', label: { en: 'Technology & Innovation', te: 'సాంకేతికత & నూతన ఆవిష్కరణలు' } },
  { id: 'research-development', label: { en: 'Research & Development', te: 'పరిశోధన & అభివృద్ధి' } },
  { id: 'skill-development-training', label: { en: 'Skill Development & Training', te: 'నైపుణ్యాభివృద్ధి & శిక్షణ' } },
  { id: 'other-benefits', label: { en: 'Other Government & Private Benefits', te: 'ఇతర ప్రభుత్వ & ప్రైవేట్ ప్రయోజనాలు' } },
]

const domainCategoryAliases: Record<DiscoveryDomainId, string[]> = {
  'education-scholarships': ['education'],
  'jobs-employment': [],
  'agriculture-farmers': ['agriculture'],
  'health-medical': ['health'],
  'business-entrepreneurship': ['business'],
  'women-child-welfare': ['women child'],
  'social-welfare-pension': ['pension'],
  'housing-basic-needs': ['housing energy'],
  'technology-innovation': [],
  'research-development': [],
  'skill-development-training': [],
  'other-benefits': ['financial assistance'],
}

const domainKeywords: Record<DiscoveryDomainId, string[]> = {
  'education-scholarships': ['student', 'students', 'scholarship', 'education', 'school', 'college'],
  'jobs-employment': ['employment', 'job', 'jobs', 'career', 'recruitment', 'placement'],
  'agriculture-farmers': ['farmer', 'farmers', 'agriculture', 'farming'],
  'health-medical': ['health', 'healthcare', 'medical', 'hospital', 'insurance'],
  'business-entrepreneurship': ['business', 'entrepreneur', 'entrepreneurship', 'msme', 'self employed', 'artisan', 'artisans'],
  'women-child-welfare': ['women', 'woman', 'child', 'children', 'maternal', 'girl child'],
  'social-welfare-pension': ['pension', 'social security', 'senior citizens', 'widow', 'disability'],
  'housing-basic-needs': ['housing', 'solar', 'renewable energy', 'electricity', 'energy'],
  'technology-innovation': ['technology', 'innovation', 'digital', 'startup'],
  'research-development': ['research', 'science', 'development'],
  'skill-development-training': ['skill', 'skills', 'training', 'vocational', 'weaver', 'weavers', 'textiles'],
  'other-benefits': [],
}

function normalizedWords(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

export function getSchemeDomainIds(scheme: { category: string; tags: string[] }): DiscoveryDomainId[] {
  const category = normalizedWords(scheme.category)
  const searchableText = normalizedWords(`${scheme.category} ${scheme.tags.join(' ')}`)
  const matched = discoveryDomains
    .filter(({ id }) => {
      const categories = domainCategoryAliases[id]
      if (categories.includes(category)) return true
      return domainKeywords[id].some((keyword) =>
        ` ${searchableText} `.includes(` ${normalizedWords(keyword)} `)
      )
    })
    .map(({ id }) => id)

  if (category === 'financial assistance') matched.push('other-benefits')
  if (matched.length === 0) matched.push('other-benefits')
  return [...new Set(matched)]
}

export function schemeMatchesDomains(
  scheme: { category: string; tags: string[] },
  selectedDomains: DiscoveryDomainId[]
): boolean {
  return selectedDomains.length === 0 ||
    getSchemeDomainIds(scheme).some((domain) => selectedDomains.includes(domain))
}

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
