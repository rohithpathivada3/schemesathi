export type CareerGuide = {
  field: string
  roles: string[]
  skills: string[]
}

// Illustrative role/search keywords, not live vacancies or guarantees of qualification.
export const careerGuides: CareerGuide[] = [
  { field: 'Computer Science & IT', roles: ['software developer', 'web developer', 'data analyst', 'software QA tester', 'IT support technician'], skills: ['programming fundamentals', 'web development', 'data tools', 'software testing'] },
  { field: 'Mechanical Engineering', roles: ['CAD design trainee', 'production trainee', 'quality technician', 'maintenance apprentice'], skills: ['CAD tools', 'manufacturing basics', 'quality processes', 'equipment maintenance'] },
  { field: 'Electrical & Electronics', roles: ['electrical design trainee', 'electronics testing technician', 'solar PV technician', 'embedded systems intern'], skills: ['electrical safety', 'circuit fundamentals', 'testing tools', 'renewable energy'] },
  { field: 'Civil Engineering', roles: ['site engineering trainee', 'CAD drafting assistant', 'BIM modeller intern', 'quantity surveying trainee'], skills: ['construction safety', 'CAD/BIM tools', 'surveying', 'estimation basics'] },
  { field: 'Chemical Engineering', roles: ['process operations trainee', 'laboratory analyst trainee', 'quality assurance intern', 'process safety assistant'], skills: ['lab safety', 'process fundamentals', 'quality methods', 'technical documentation'] },
  { field: 'Business & Commerce', roles: ['accounts assistant', 'finance operations intern', 'business analyst trainee', 'digital marketing assistant'], skills: ['spreadsheets', 'bookkeeping basics', 'business communication', 'market research'] },
  { field: 'Arts & Humanities', roles: ['content writing intern', 'research assistant', 'communications trainee', 'community outreach assistant'], skills: ['writing', 'research methods', 'presentation', 'local-language communication'] },
  { field: 'Science & Research', roles: ['laboratory assistant', 'research intern', 'quality control trainee', 'data collection assistant'], skills: ['lab safety', 'research methods', 'data handling', 'technical reporting'] },
  { field: 'Healthcare & Life Sciences', roles: ['public health programme intern', 'clinical research assistant', 'healthcare operations trainee', 'laboratory support assistant'], skills: ['health data basics', 'research ethics', 'documentation', 'patient privacy'] },
  { field: 'Agriculture', roles: ['agriculture field assistant', 'agri-business trainee', 'crop research intern', 'farm extension assistant'], skills: ['crop science basics', 'field data collection', 'soil and water practices', 'farmer communication'] },
  { field: 'Skilled trades & vocational', roles: ['electrician apprentice', 'fitter apprentice', 'welding trainee', 'automotive service technician'], skills: ['trade safety', 'tool handling', 'technical drawing', 'workplace readiness'] },
  { field: 'Design & Media', roles: ['graphic design intern', 'UI/UX design trainee', 'video editing assistant', 'digital content creator'], skills: ['portfolio building', 'design tools', 'visual communication', 'accessibility basics'] },
  { field: 'Other / exploring', roles: ['career counselling', 'general operations trainee', 'customer support associate', 'office administration assistant'], skills: ['digital literacy', 'communication', 'teamwork', 'career exploration'] },
]

export function generateCareerSearchTerms(field: string, status = '', qualification = ''): string[] {
  const guide = careerGuides.find((item) => item.field === field)
  if (!guide) return []

  return guide.roles.map((role) => {
    const cleanRole = role.replace(/\b(intern|internship|apprentice|trainee)\b/gi, '').replace(/\s+/g, ' ').trim()
    const profileTag = qualification || status
    if (status === 'School student') return `Explore a ${cleanRole} career path (${profileTag})`
    if (status === 'College student' && ['Class 10', 'Class 12', 'ITI / trade certificate'].includes(qualification)) return `${cleanRole} practical training or internship (${qualification})`
    if (status === 'College student') return `${cleanRole} internship (${profileTag || 'college student'})`
    if (status === 'Currently employed') return `Experienced ${cleanRole} roles (${profileTag || 'currently employed'})`
    if (status === 'Returning to work') return `${cleanRole} return-to-work roles (${profileTag || 'returning to work'})`
    if (status === 'Recent graduate' || status === 'Looking for work') return `${cleanRole} entry-level roles (${profileTag || 'job seeker'})`
    if (['Class 10', 'Class 12', 'ITI / trade certificate'].includes(qualification)) return `${cleanRole} apprenticeship or technician roles (${qualification})`
    if (['Diploma', 'Undergraduate', 'Graduate', 'Postgraduate'].includes(qualification)) return `${cleanRole} graduate trainee roles (${qualification})`
    return `${cleanRole} opportunities`
  })
}
