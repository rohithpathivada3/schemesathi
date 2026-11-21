import { getDatabase } from './database.mjs'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export function hashPassword(password) {
  const salt = 'schemesathi_salt_2026'
  return crypto.createHash('sha256').update(password + salt).digest('hex')
}

export function seedDatabase(force = false) {
  const db = getDatabase()

  // 1. Seed default admin if not exists
  const existingAdmin = db.prepare('SELECT id FROM admin_users WHERE email = ?').get('admin@schemesathi.in')
  if (!existingAdmin) {
    const passwordHash = hashPassword('Admin@12345')
    db.prepare(`
      INSERT INTO admin_users (email, password_hash, name, role)
      VALUES (?, ?, ?, ?)
    `).run('admin@schemesathi.in', passwordHash, 'System Administrator', 'super_admin')
    console.log('Seeded default admin: admin@schemesathi.in / Admin@12345')
  }

  const countRow = db.prepare('SELECT COUNT(*) as count FROM schemes').get()
  if (countRow.count > 0 && !force) {
    console.log(`Database already contains ${countRow.count} schemes. Skipping re-seed.`)
    return
  }

  if (force) {
    db.exec('DELETE FROM criteria; DELETE FROM required_documents; DELETE FROM application_steps; DELETE FROM schemes;')
  }

  const insertScheme = db.prepare(`
    INSERT INTO schemes (
      id, name, name_te, government_level, department, department_te,
      description, description_te, purpose, benefit, benefit_te,
      category, state, helpline, deadline, official_url, official_source_url,
      source_reference, last_verified, criteria_complete, is_active, color, symbol
    ) VALUES (
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?
    )
  `)

  const insertCriterion = db.prepare(`
    INSERT INTO criteria (
      scheme_id, field, operator, expected_value, mandatory,
      source_url, verified_at, explanation, explanation_te
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const insertDocument = db.prepare(`
    INSERT INTO required_documents (
      scheme_id, name, name_te, is_mandatory, issuing_authority, source_url, verified_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `)

  const insertStep = db.prepare(`
    INSERT INTO application_steps (
      scheme_id, step_number, title, instruction, instruction_te, source_url, verified_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `)

  const allSchemes = [
    {
      id: 'pm-kisan',
      name: 'PM-KISAN Samman Nidhi',
      name_te: 'పీఎం-కిసాన్ సమ్మాన్ నిధి',
      government_level: 'Central',
      department: 'Ministry of Agriculture & Farmers Welfare',
      department_te: 'వ్యవసాయ మరియు రైతు సంక్షేమ మంత్రిత్వ శాఖ',
      description: 'Central Sector scheme providing income support to eligible landholding farmer families across India, subject to official scheme exclusions.',
      description_te: 'భారతదేశంలోని అర్హులైన భూమి గల రైతు కుటుంబాలకు ఆర్థిక సహాయం అందించే కేంద్ర ప్రభుత్వ పథకం.',
      purpose: 'To supplement the financial needs of landholding farmers in procuring various agricultural inputs and domestic needs.',
      benefit: '₹6,000 per year directly to bank account in 3 equal instalments of ₹2,000 every 4 months.',
      benefit_te: 'ఏడాదికి ₹6,000 రూపాయలు మూడు విడతల్లో నేరుగా లబ్ధిదారుడి బ్యాంక్ ఖాతాలో జమ.',
      category: 'Agriculture',
      state: 'All India',
      helpline: '155261 / 011-24300606',
      deadline: 'Open throughout the year',
      official_url: 'https://pmkisan.gov.in/',
      official_source_url: 'https://pmkisan.gov.in/',
      source_reference: 'PM-KISAN official portal, Operational Guidelines & Exclusion criteria',
      last_verified: '2026-11-20',
      criteria_complete: 0,
      is_active: 1,
      color: 'mint',
      symbol: '🌾',
      criteria: [
        { field: 'farmer', operator: 'equals', expected: true, mandatory: 1, sourceUrl: 'https://pmkisan.gov.in/', verifiedAt: '2026-11-20', explanation: 'Applicant must be an operational landholding farmer family.', explanation_te: 'దరఖాస్తుదారుడు భూమి కలిగిన రైతు కుటుంబానికి చెందినవారై ఉండాలి.' }
      ],
      documents: [
        { name: 'Aadhaar Card linked with Bank Account', name_te: 'బ్యాంక్ ఖాతాతో అనుసంధానమైన ఆధార్ కార్డు', is_mandatory: 1, authority: 'UIDAI', sourceUrl: 'https://pmkisan.gov.in/', verifiedAt: '2026-11-20' },
        { name: 'Land Record Ownership Document / Pattadar Passbook', name_te: 'భూమి పట్టాదారు పాస్ పుస్తకం / రెవెన్యూ రికార్డు', is_mandatory: 1, authority: 'State Revenue Department', sourceUrl: 'https://pmkisan.gov.in/', verifiedAt: '2026-11-20' }
      ],
      steps: [
        { step_number: 1, title: 'Check Eligibility', instruction: 'Ensure you are a cultivating landholder and do not fall under income tax exclusions.', instruction_te: 'మీరు భూయజమాని అయి ఉండాలి.', sourceUrl: 'https://pmkisan.gov.in/', verifiedAt: '2026-11-20' },
        { step_number: 2, title: 'Submit Registration & eKYC', instruction: 'Fill details on pmkisan.gov.in or nearest CSC/RBK and complete biometric eKYC.', instruction_te: 'పోర్టల్ లో నమోదు చేసి ఈ-కేవైసీ పూర్తి చేయండి.', sourceUrl: 'https://pmkisan.gov.in/', verifiedAt: '2026-11-20' }
      ]
    },
    {
      id: 'pmjay',
      name: 'Ayushman Bharat PM-JAY',
      name_te: 'ఆయుష్మాన్ భారత్ పీఎం-జేఏవై',
      government_level: 'Central',
      department: 'National Health Authority',
      department_te: 'జాతీయ ఆరోగ్య ప్రాధికార సంస్థ (NHA)',
      description: 'Flagship health protection scheme offering cashless hospitalization coverage up to ₹5 lakh per family per year across empaneled public and private hospitals.',
      description_te: 'పేద కుటుంబాలకు నెట్‌వర్క్ ఆసుపత్రులలో ఉచితంగా ఏడాదికి ₹5 లక్షల వరకు నగదు రహిత చికిత్స అందించే ఆరోగ్య పథకం.',
      purpose: 'To provide catastrophic financial protection against major illnesses and inpatient hospitalisation expenses.',
      benefit: 'Cashless healthcare cover up to ₹5,00,000 per family per year for secondary and tertiary inpatient care.',
      benefit_te: 'కుటుంబానికి ఏడాదికి ₹5,00,000 వరకు ఉచిత క్యాష్‌లెస్ ఆసుపత్రి చికిత్స.',
      category: 'Health',
      state: 'All India',
      helpline: '14555 / 1800-111-565',
      deadline: 'Continuous enrollment',
      official_url: 'https://pmjay.gov.in/',
      official_source_url: 'https://pmjay.gov.in/',
      source_reference: 'National Health Authority official portal guidelines',
      last_verified: '2026-11-20',
      criteria_complete: 1,
      is_active: 1,
      color: 'blue',
      symbol: '🏥',
      criteria: [
        { field: 'bpl', operator: 'equals', expected: true, mandatory: 1, sourceUrl: 'https://pmjay.gov.in/', verifiedAt: '2026-11-20', explanation: 'Beneficiary family must belong to SECC 2011 identified deprived groups or hold a recognized BPL/Ration Card.', explanation_te: 'కుటుంబం దారిద్య్రరేఖకు దిగువన (BPL) లేదా తెల్ల రేషన్ కార్డు కలిగి ఉండాలి.' }
      ],
      documents: [
        { name: 'Ration Card / BPL Card / SECC Household ID', name_te: 'రేషన్ కార్డు / బి.పి.ఎల్ కార్డు', is_mandatory: 1, authority: 'Civil Supplies Dept', sourceUrl: 'https://pmjay.gov.in/', verifiedAt: '2026-11-20' },
        { name: 'Aadhaar Card of all family members', name_te: 'కుటుంబ సభ్యులందరి ఆధార్ కార్డులు', is_mandatory: 1, authority: 'UIDAI', sourceUrl: 'https://pmjay.gov.in/', verifiedAt: '2026-11-20' }
      ],
      steps: [
        { step_number: 1, title: 'Verify Eligibility', instruction: 'Visit beneficiary.nha.gov.in and check eligibility using your Ration card number, mobile, or Aadhaar.', instruction_te: 'పోర్టల్ లో మీ రేషన్ లేదా ఆధార్ ద్వారా పేరు పరిశీలించండి.', sourceUrl: 'https://pmjay.gov.in/', verifiedAt: '2026-11-20' },
        { step_number: 2, title: 'Generate Ayushman Card', instruction: 'Approach the Ayushman Mitra desk at any empanelled hospital or local CSC for biometric authentication.', instruction_te: 'ఆయుష్మాన్ మిత్ర డెస్క్ వద్ద బయోమెట్రిక్ ద్వారా కార్డు పొందండి.', sourceUrl: 'https://pmjay.gov.in/', verifiedAt: '2026-11-20' }
      ]
    },
    {
      id: 'vishwakarma',
      name: 'PM Vishwakarma Scheme',
      name_te: 'పీఎం విశ్వకర్మ యోజన',
      government_level: 'Central',
      department: 'Ministry of Micro, Small & Medium Enterprises',
      department_te: 'సూక్ష్మ, చిన్న & మధ్య తరహా పరిశ్రమల మంత్రిత్వ శాఖ (MSME)',
      description: 'Comprehensive financial and skill support scheme for traditional artisans and craftspeople working across 18 designated trades.',
      description_te: 'చేతివృత్తులు మరియు సాంప్రదాయ వృత్తిదారులకు నైపుణ్య శిక్షణ, ఆధునిక పనిముట్లు మరియు తక్కువ వడ్డీ రుణాలు అందించే పథకం.',
      purpose: 'To preserve guru-shishya parampara, upgrade skills, provide modern toolkits, and offer collateral-free enterprise credit to artisans.',
      benefit: 'Skill training stipend of ₹500/day, ₹15,000 toolkit voucher, PM Vishwakarma ID card, and enterprise loans up to ₹3 lakh at 5% interest.',
      benefit_te: 'రోజుకు ₹500 స్టైపెండ్‌తో ఉచిత శిక్షణ, ₹15,000 విలువైన ఆధునిక పనిముట్లు మరియు 5% రాయితీ వడ్డీతో ₹3 లక్షల వరకు రుణం.',
      category: 'Business',
      state: 'All India',
      helpline: '1800-267-7777',
      deadline: 'Open registration',
      official_url: 'https://pmvishwakarma.gov.in/',
      official_source_url: 'https://pmvishwakarma.gov.in/',
      source_reference: 'PM Vishwakarma Scheme Guidelines 2023-24',
      last_verified: '2026-11-20',
      criteria_complete: 1,
      is_active: 1,
      color: 'peach',
      symbol: '🔨',
      criteria: [
        { field: 'age', operator: 'min', expected: 18, mandatory: 1, sourceUrl: 'https://pmvishwakarma.gov.in/', verifiedAt: '2026-11-20', explanation: 'Applicant must be at least 18 years of age on the date of registration.', explanation_te: 'దరఖాస్తుదారుడికి కనీసం 18 సంవత్సరాలు నిండి ఉండాలి.' }
      ],
      documents: [
        { name: 'Aadhaar Card (Biometric enabled)', name_te: 'ఆధార్ కార్డు', is_mandatory: 1, authority: 'UIDAI', sourceUrl: 'https://pmvishwakarma.gov.in/', verifiedAt: '2026-11-20' },
        { name: 'Active Bank Account linked with Aadhaar', name_te: 'ఆధార్ లింక్ అయిన బ్యాంక్ పాస్ పుస్తకం', is_mandatory: 1, authority: 'Bank', sourceUrl: 'https://pmvishwakarma.gov.in/', verifiedAt: '2026-11-20' }
      ],
      steps: [
        { step_number: 1, title: 'Trade Eligibility', instruction: 'Confirm trade eligibility across 18 craft categories.', instruction_te: '18 విభాగాల్లో మీ వృత్తి ఉందో లేదో చూడండి.', sourceUrl: 'https://pmvishwakarma.gov.in/', verifiedAt: '2026-11-20' },
        { step_number: 2, title: 'Register at CSC', instruction: 'Visit local CSC with Aadhaar and bank details for free registration.', instruction_te: 'సమీపంలోని CSC కేంద్రాన్ని సంప్రదించండి.', sourceUrl: 'https://pmvishwakarma.gov.in/', verifiedAt: '2026-11-20' }
      ]
    },
    {
      id: 'apy',
      name: 'Atal Pension Yojana',
      name_te: 'అటల్ పెన్షన్ యోజన',
      government_level: 'Central',
      department: 'Pension Fund Regulatory and Development Authority (PFRDA)',
      department_te: 'పెన్షన్ ఫండ్ నియంత్రణ & అభివృద్ధి ప్రాధికార సంస్థ (PFRDA)',
      description: 'Government-backed pension scheme aimed at creating a universal social security system for unorganized sector workers.',
      description_te: 'అసంఘటిత రంగ కార్మికులకు 60 ఏళ్ల తర్వాత నెలకు ₹1,000 నుండి ₹5,000 వరకు జీవితాంతం పెన్షన్ అందించే కేంద్ర ప్రభుత్వ పథకం.',
      purpose: 'To ensure income security in old age for citizens working in the informal economy.',
      benefit: 'Guaranteed minimum monthly pension of ₹1,000 to ₹5,000 from age 60 onwards for life, followed by spouse pension.',
      benefit_te: '60 ఏళ్లు నిండిన తర్వాత జీవితాంతం నెలకు ₹1,000 నుండి ₹5,000 వరకు గ్యారెంటీ పెన్షన్.',
      category: 'Pension',
      state: 'All India',
      helpline: '1800-110-069',
      deadline: 'Join between ages 18 and 40',
      official_url: 'https://www.pfrda.org.in/',
      official_source_url: 'https://www.pfrda.org.in/',
      source_reference: 'PFRDA / Ministry of Finance APY Operational Guidelines',
      last_verified: '2026-11-20',
      criteria_complete: 1,
      is_active: 1,
      color: 'lavender',
      symbol: '🛡️',
      criteria: [
        { field: 'age', operator: 'min', expected: 18, mandatory: 1, sourceUrl: 'https://www.pfrda.org.in/', verifiedAt: '2026-11-20', explanation: 'Applicant must be at least 18 years old to join.', explanation_te: 'కనీసం 18 సంవత్సరాలు నిండి ఉండాలి.' },
        { field: 'age', operator: 'max', expected: 40, mandatory: 1, sourceUrl: 'https://www.pfrda.org.in/', verifiedAt: '2026-11-20', explanation: 'Applicant must not exceed 40 years of age at joining.', explanation_te: '40 సంవత్సరాలకు మించకూడదు.' }
      ],
      documents: [
        { name: 'Savings Bank Account / Post Office Account', name_te: 'సేవింగ్స్ బ్యాంక్ ఖాతా లేదా పోస్టాఫీస్ ఖాతా', is_mandatory: 1, authority: 'Bank / Post Office', sourceUrl: 'https://www.pfrda.org.in/', verifiedAt: '2026-11-20' },
        { name: 'Aadhaar Card copy', name_te: 'ఆధార్ కార్డు నకలు', is_mandatory: 1, authority: 'UIDAI', sourceUrl: 'https://www.pfrda.org.in/', verifiedAt: '2026-11-20' }
      ],
      steps: [
        { step_number: 1, title: 'Choose Pension Amount', instruction: 'Select monthly pension amount (₹1,000 - ₹5,000).', instruction_te: 'పెన్షన్ మొత్తాన్ని ఎంచుకోండి.', sourceUrl: 'https://www.pfrda.org.in/', verifiedAt: '2026-11-20' },
        { step_number: 2, title: 'Submit APY Form at Bank', instruction: 'Submit registration at your bank branch or via mobile/net banking.', instruction_te: 'బ్యాంక్ బ్రాంచ్‌ను సంప్రదించండి.', sourceUrl: 'https://www.pfrda.org.in/', verifiedAt: '2026-11-20' }
      ]
    },
    {
      id: 'surya-ghar',
      name: 'PM Surya Ghar: Muft Bijli Yojana',
      name_te: 'పీఎం సూర్య ఘర్: ఉచిత విద్యుత్ పథకం',
      government_level: 'Central',
      department: 'Ministry of New and Renewable Energy',
      department_te: 'నూతన & పునరుత్పాదక ఇంధన మంత్రిత్వ శాఖ',
      description: 'National solar rooftop initiative providing direct financial subsidies up to ₹78,000 for residential households to install solar power systems.',
      description_te: 'ఇంటి పైకప్పుపై సోలార్ ప్యానెల్స్ ఏర్పాటు చేసుకునే గృహాలకు గరిష్టంగా ₹78,000 వరకు కేంద్ర రాయితీ అందించే పథకం.',
      purpose: 'To empower 1 crore Indian residential households with free solar electricity (up to 300 units/month).',
      benefit: 'Subsidy up to ₹78,000 + up to 300 units free power every month.',
      benefit_te: 'ఇంటి సోలార్ కోసం ₹78,000 వరకు నేరుగా రాయితీ మరియు ప్రతి నెలా 300 యూనిట్ల వరకు ఉచిత విద్యుత్.',
      category: 'Housing & energy',
      state: 'All India',
      helpline: '15555 / 1800-180-3333',
      deadline: 'Phase open throughout 2026-27',
      official_url: 'https://pmsuryaghar.gov.in/',
      official_source_url: 'https://pmsuryaghar.gov.in/',
      source_reference: 'PM Surya Ghar official portal guidelines',
      last_verified: '2026-11-20',
      criteria_complete: 1,
      is_active: 1,
      color: 'yellow',
      symbol: '☀️',
      criteria: [
        { field: 'housingStatus', operator: 'oneOf', expected: ['Own home', 'Own permanent (Pucca) house'], mandatory: 1, sourceUrl: 'https://pmsuryaghar.gov.in/', verifiedAt: '2026-11-20', explanation: 'Must have a suitable residential roof and domestic connection.', explanation_te: 'సొంత ఇల్లు మరియు విద్యుత్ కనెక్షన్ ఉండాలి.' }
      ],
      documents: [
        { name: 'Latest Electricity Bill (with Consumer Number)', name_te: 'ఇటీవలి విద్యుత్ బిల్లు', is_mandatory: 1, authority: 'DISCOM', sourceUrl: 'https://pmsuryaghar.gov.in/', verifiedAt: '2026-11-20' },
        { name: 'Aadhaar Card of Electricity Consumer', name_te: 'విద్యుత్ మీటర్ దారుడి ఆధార్ కార్డు', is_mandatory: 1, authority: 'UIDAI', sourceUrl: 'https://pmsuryaghar.gov.in/', verifiedAt: '2026-11-20' }
      ],
      steps: [
        { step_number: 1, title: 'Register on National Portal', instruction: 'Visit pmsuryaghar.gov.in and enter your State and Consumer Number.', instruction_te: 'పోర్టల్ లో రిజిస్టర్ అవ్వండి.', sourceUrl: 'https://pmsuryaghar.gov.in/', verifiedAt: '2026-11-20' },
        { step_number: 2, title: 'Install Solar & Claim Subsidy', instruction: 'Install through registered vendor, get DISCOM net meter, and claim subsidy.', instruction_te: 'సోలార్ ఏర్పాటు చేసుకుని రాయితీ పొందండి.', sourceUrl: 'https://pmsuryaghar.gov.in/', verifiedAt: '2026-11-20' }
      ]
    },
    {
      id: 'scholarships',
      name: 'National Scholarship - Post Matric (SC/ST/OBC)',
      name_te: 'నేషనల్ పోస్ట్ మెట్రిక్ స్కాలర్‌షిప్',
      government_level: 'Central / state programmes',
      department: 'Ministry of Social Justice and Empowerment',
      department_te: 'సామాజిక న్యాయం & సాధికారత మంత్రిత్వ శాఖ',
      description: 'Financial assistance for post-matriculation or post-secondary stages of education to reduce dropout rates among disadvantaged communities.',
      description_te: '10వ తరగతి తర్వాత ఇంటర్, డిగ్రీ చదివే ఎస్సీ, ఎస్టీ, బీసీ విద్యార్థులకు ఫీజు రీయింబర్స్‌మెంట్ మరియు స్కాలర్‌షిప్.',
      purpose: 'To support students from economically weaker communities in pursuing higher education.',
      benefit: 'Full compulsory fees reimbursement + annual maintenance allowance up to ₹13,500.',
      benefit_te: 'పూర్తి కాలేజీ ఫీజు రీయింబర్స్‌మెంట్ మరియు వార్షిక నిర్వహణ అలవెన్స్.',
      category: 'Education',
      state: 'All India',
      helpline: '0120-6619540',
      deadline: 'Annual window (July - November)',
      official_url: 'https://scholarships.gov.in/',
      official_source_url: 'https://scholarships.gov.in/',
      source_reference: 'National Scholarship Portal (NSP 2.0) guidelines',
      last_verified: '2026-11-20',
      criteria_complete: 1,
      is_active: 1,
      color: 'blue',
      symbol: '🎓',
      criteria: [
        { field: 'currentStatus', operator: 'oneOf', expected: ['School student', 'College student', 'Recent graduate'], mandatory: 1, sourceUrl: 'https://scholarships.gov.in/', verifiedAt: '2026-11-20', explanation: 'Must be a currently enrolled regular student.', explanation_te: 'రెగ్యులర్ విద్యార్థిగా చేరి ఉండాలి.' },
        { field: 'socialCategory', operator: 'oneOf', expected: ['SC', 'ST', 'OBC', 'EWS'], mandatory: 1, sourceUrl: 'https://scholarships.gov.in/', verifiedAt: '2026-11-20', explanation: 'Eligible for SC, ST, OBC, or EWS students.', explanation_te: 'ఎస్సీ, ఎస్టీ, బీసీ వర్గానికి చెందినవారై ఉండాలి.' }
      ],
      documents: [
        { name: 'Caste Certificate', name_te: 'కుల ధృవీకరణ పత్రం', is_mandatory: 1, authority: 'Revenue Dept', sourceUrl: 'https://scholarships.gov.in/', verifiedAt: '2026-11-20' },
        { name: 'Income Certificate', name_te: 'ఆదాయ ధృవీకరణ పత్రం', is_mandatory: 1, authority: 'Revenue Dept', sourceUrl: 'https://scholarships.gov.in/', verifiedAt: '2026-11-20' }
      ],
      steps: [
        { step_number: 1, title: 'Register on NSP', instruction: 'Generate One-Time Registration (OTR) on scholarships.gov.in.', instruction_te: 'ఆన్‌లైన్‌లో ఓటీఆర్ పూర్తి చేయండి.', sourceUrl: 'https://scholarships.gov.in/', verifiedAt: '2026-11-20' }
      ]
    },
    {
      id: 'ap-rythu-bharosa',
      name: 'AP Rythu Bharosa',
      name_te: 'ఆంధ్రప్రదేశ్ రైతు భరోసా',
      government_level: 'State',
      department: 'Department of Agriculture, Government of Andhra Pradesh',
      department_te: 'వ్యవసాయ శాఖ, ఆంధ్రప్రదేశ్ ప్రభుత్వం',
      description: 'Comprehensive financial assistance scheme providing ₹13,500/year to landowning farmer families as well as SC, ST, BC, and Minority tenant farmers in Andhra Pradesh.',
      description_te: 'ఆంధ్రప్రదేశ్ లోని రైతులకు మరియు కౌలు రైతులకు వ్యవసాయ పెట్టుబడి సహాయం కింద ఏడాదికి ₹13,500 అందించే రాష్ట్ర ప్రభుత్వ ప్రతిష్టాత్మక పథకం.',
      purpose: 'To support cultivating farmers with timely investment aid before crop sowing seasons and eliminate debt trap.',
      benefit: '₹13,500 per year per farmer family in 3 installments.',
      benefit_te: 'ఏడాదికి ₹13,500 రూపాయలు మూడు విడతల్లో పెట్టుబడి సాయంగా నేరుగా బ్యాంక్ ఖాతాలో జమ.',
      category: 'Agriculture',
      state: 'Andhra Pradesh',
      helpline: '1902 / 155251',
      deadline: 'Before Kharif and Rabi crop seasons',
      official_url: 'https://ysrrythubharosa.ap.gov.in/',
      official_source_url: 'https://ysrrythubharosa.ap.gov.in/',
      source_reference: 'AP Agriculture Department, G.O.Ms No. 113',
      last_verified: '2026-11-20',
      criteria_complete: 1,
      is_active: 1,
      color: 'mint',
      symbol: '🌾',
      criteria: [
        { field: 'state', operator: 'equals', expected: 'Andhra Pradesh', mandatory: 1, sourceUrl: 'https://ysrrythubharosa.ap.gov.in/', verifiedAt: '2026-11-20', explanation: 'Applicant must be a permanent resident of Andhra Pradesh.', explanation_te: 'దరఖాస్తుదారుడు ఆంధ్రప్రదేశ్ రాష్ట్ర శాశ్వత నివాసి అయి ఉండాలి.' },
        { field: 'farmer', operator: 'equals', expected: true, mandatory: 1, sourceUrl: 'https://ysrrythubharosa.ap.gov.in/', verifiedAt: '2026-11-20', explanation: 'Must be an operational land-owning farmer or a tenant farmer holding a valid CCRC card.', explanation_te: 'సాగు చేస్తున్న భూయజమాని రైతు లేదా CCRC కార్డు కలిగిన కౌలు రైతు అయి ఉండాలి.' }
      ],
      documents: [
        { name: 'AP Pattadar Passbook / 1B Namuna Record', name_te: 'ఆంధ్రప్రదేశ్ పట్టాదారు పాస్ పుస్తకం / 1B అడంగల్', is_mandatory: 1, authority: 'AP Revenue Dept', sourceUrl: 'https://ysrrythubharosa.ap.gov.in/', verifiedAt: '2026-11-20' },
        { name: 'Aadhaar Card with biometric e-KYC', name_te: 'ఆధార్ కార్డు మరియు ఈ-కేవైసీ', is_mandatory: 1, authority: 'UIDAI', sourceUrl: 'https://ysrrythubharosa.ap.gov.in/', verifiedAt: '2026-11-20' }
      ],
      steps: [
        { step_number: 1, title: 'Visit RBK', instruction: 'Contact Village Agriculture Assistant at your nearest Rythu Bharosa Kendram.', instruction_te: 'రైతు భరోసా కేంద్రం (RBK) లో సంప్రదించండి.', sourceUrl: 'https://ysrrythubharosa.ap.gov.in/', verifiedAt: '2026-11-20' }
      ]
    },
    {
      id: 'ap-amma-vodi',
      name: 'Jagananna Amma Vodi / Thalliki Vandanam',
      name_te: 'అమ్మ ఒడి / తల్లికి వందనం',
      government_level: 'State',
      department: 'School Education Department, Government of Andhra Pradesh',
      department_te: 'పాఠశాల విద్యా శాఖ, ఆంధ్రప్రదేశ్ ప్రభుత్వం',
      description: 'Financial assistance of ₹15,000 per year directly to poor mothers for sending their children to recognized schools from Class 1 to Class 12.',
      description_te: 'పేద తల్లులు తమ పిల్లలను బడికి పంపేందుకు ప్రోత్సాహకంగా 1వ తరగతి నుండి ఇంటర్ వరకు ఏటా ₹15,000 ఆర్థిక సాయం అందించే పథకం.',
      purpose: 'To curb child labour, eradicate school dropouts, and enhance enrollment.',
      benefit: '₹15,000 annual direct financial support credited into the mother\'s bank account.',
      benefit_te: 'పిల్లల చదువు కోసం తల్లి బ్యాంక్ ఖాతాలో ఏటా ₹15,000 నేరుగా జమ.',
      category: 'Education',
      state: 'Andhra Pradesh',
      helpline: '1902 / 0866-2883941',
      deadline: 'Annual school reopening cycle (June - July)',
      official_url: 'https://jaganannaammavodi.ap.gov.in/',
      official_source_url: 'https://jaganannaammavodi.ap.gov.in/',
      source_reference: 'AP School Education Dept Guidelines & Jagananna Amma Vodi Rules',
      last_verified: '2026-11-20',
      criteria_complete: 1,
      is_active: 1,
      color: 'peach',
      symbol: '👩‍👧',
      criteria: [
        { field: 'state', operator: 'equals', expected: 'Andhra Pradesh', mandatory: 1, sourceUrl: 'https://jaganannaammavodi.ap.gov.in/', verifiedAt: '2026-11-20', explanation: 'Mother and child must be permanent residents of Andhra Pradesh.', explanation_te: 'తల్లి మరియు పిల్లలు ఆంధ్రప్రదేశ్ నివాసితులై ఉండాలి.' },
        { field: 'bpl', operator: 'equals', expected: true, mandatory: 1, sourceUrl: 'https://jaganannaammavodi.ap.gov.in/', verifiedAt: '2026-11-20', explanation: 'Family must possess a valid AP Rice Card / White Ration Card.', explanation_te: 'తెల్ల రేషన్ లేదా బియ్యం కార్డు ఉండాలి.' }
      ],
      documents: [
        { name: 'AP White Ration Card / Rice Card', name_te: 'ఆంధ్రప్రదేశ్ తెల్ల రేషన్ కార్డు', is_mandatory: 1, authority: 'AP Civil Supplies', sourceUrl: 'https://jaganannaammavodi.ap.gov.in/', verifiedAt: '2026-11-20' },
        { name: 'Mother\'s Aadhaar Card', name_te: 'తల్లి ఆధార్ కార్డు', is_mandatory: 1, authority: 'UIDAI', sourceUrl: 'https://jaganannaammavodi.ap.gov.in/', verifiedAt: '2026-11-20' }
      ],
      steps: [
        { step_number: 1, title: 'Maintain 75% Attendance', instruction: 'Ensure child maintains at least 75% attendance in school.', instruction_te: '75% హాజరు ఉండేలా చూసుకోండి.', sourceUrl: 'https://jaganannaammavodi.ap.gov.in/', verifiedAt: '2026-11-20' }
      ]
    },
    {
      id: 'ap-vidya-deevena',
      name: 'Jagananna Vidya Deevena (RTF)',
      name_te: 'జగనన్న విద్యా దీవెన (ఫీజు రీయింబర్స్‌మెంట్)',
      government_level: 'State',
      department: 'Higher Education Department, Government of Andhra Pradesh',
      department_te: 'ఉన్నత విద్యా శాఖ, ఆంధ్రప్రదేశ్ ప్రభుత్వం',
      description: 'Complete 100% tuition fee reimbursement for students pursuing ITI, Polytechnic, Degree, Engineering, and PG courses in Andhra Pradesh.',
      description_te: 'ఐటీఐ, పాలిటెక్నిక్, డిగ్రీ, ఇంజనీరింగ్ చదివే పేద విద్యార్థులకు పూర్తి కాలేజీ ఫీజులను ప్రభుత్వం భరించే పథకం.',
      purpose: 'To ensure financial constraints do not prevent youth from pursuing higher education.',
      benefit: '100% full fee reimbursement paid directly in quarterly installments to mothers\' bank accounts.',
      benefit_te: 'పూర్తి కాలేజీ ఫీజు రీయింబర్స్‌మెంట్ త్రైమాసిక విడతల్లో తల్లి ఖాతాలో జమ.',
      category: 'Education',
      state: 'Andhra Pradesh',
      helpline: '1902 / 08645-274000',
      deadline: 'Academic year counseling periods',
      official_url: 'https://navasakam.ap.gov.in/',
      official_source_url: 'https://navasakam.ap.gov.in/',
      source_reference: 'AP Higher Education Dept, G.O.Ms No. 115',
      last_verified: '2026-11-20',
      criteria_complete: 1,
      is_active: 1,
      color: 'blue',
      symbol: '🎓',
      criteria: [
        { field: 'state', operator: 'equals', expected: 'Andhra Pradesh', mandatory: 1, sourceUrl: 'https://navasakam.ap.gov.in/', verifiedAt: '2026-11-20', explanation: 'Student and parents must be permanent residents of Andhra Pradesh.', explanation_te: 'ఆంధ్రప్రదేశ్ నివాసితులై ఉండాలి.' },
        { field: 'currentStatus', operator: 'oneOf', expected: ['College student', 'Recent graduate'], mandatory: 1, sourceUrl: 'https://navasakam.ap.gov.in/', verifiedAt: '2026-11-20', explanation: 'Must be enrolled in regular college degree or professional program.', explanation_te: 'కళాశాల రెగ్యులర్ కోర్సులో చేరి ఉండాలి.' }
      ],
      documents: [
        { name: 'AP Rice Card (or Income Certificate)', name_te: 'బియ్యం కార్డు లేదా ఆదాయ ధృవీకరణ', is_mandatory: 1, authority: 'Meeseva', sourceUrl: 'https://navasakam.ap.gov.in/', verifiedAt: '2026-11-20' },
        { name: 'College Allotment Order & Marksheet', name_te: 'కౌన్సెలింగ్ అలాట్‌మెంట్ లెటర్', is_mandatory: 1, authority: 'APSCHE', sourceUrl: 'https://navasakam.ap.gov.in/', verifiedAt: '2026-11-20' }
      ],
      steps: [
        { step_number: 1, title: 'Biometric on Jnanabhumi', instruction: 'Complete student and mother biometric eKYC at college.', instruction_te: 'జ్ఞానభూమిలో బయోమెట్రిక్ పూర్తి చేయండి.', sourceUrl: 'https://navasakam.ap.gov.in/', verifiedAt: '2026-11-20' }
      ]
    },
    {
      id: 'ap-aarogyasri',
      name: 'Dr. YSR Aarogyasri Health Scheme',
      name_te: 'డాక్టర్ వైఎస్సార్ ఆరోగ్యశ్రీ పథకం',
      government_level: 'State',
      department: 'Dr. YSR Aarogyasri Health Care Trust, AP',
      department_te: 'డాక్టర్ వైఎస్సార్ ఆరోగ్యశ్రీ హెల్త్‌కేర్ ట్రస్ట్, ఆంధ్రప్రదేశ్ ప్రభుత్వం',
      description: 'Premier state healthcare scheme providing comprehensive cashless medical treatment and critical surgeries up to ₹25 lakh for over 3,250 ailments in network hospitals.',
      description_te: 'పేద మరియు మధ్యతరగతి ప్రజలకు దాదాపు 3,250 కంటే ఎక్కువ జబ్బులకు ఉచితంగా ₹25 లక్షల వరకు కార్పొరేట్ ఆసుపత్రులలో ఉచిత వైద్యం అందించే గొప్ప ఆరోగ్య పథకం.',
      purpose: 'To provide financial protection against catastrophic illness to all eligible families in Andhra Pradesh.',
      benefit: 'Cashless treatment cover up to ₹25,00,000 per family per year, free medicines, and post-operative allowance.',
      benefit_te: 'కుటుంబానికి ఏడాదికి ₹25 లక్షల వరకు ఉచిత కార్పొరేట్ వైద్యం, ఉచిత మందులు మరియు ఆరోగ్య ఆసరా సాయం.',
      category: 'Health',
      state: 'Andhra Pradesh',
      helpline: '104 / 1800-425-1818',
      deadline: '24x7 Emergency and elective admissions',
      official_url: 'https://aarogyasri.ap.gov.in/',
      official_source_url: 'https://aarogyasri.ap.gov.in/',
      source_reference: 'Dr. YSR Aarogyasri Health Care Trust official notification',
      last_verified: '2026-11-20',
      criteria_complete: 1,
      is_active: 1,
      color: 'blue',
      symbol: '🏥',
      criteria: [
        { field: 'state', operator: 'equals', expected: 'Andhra Pradesh', mandatory: 1, sourceUrl: 'https://aarogyasri.ap.gov.in/', verifiedAt: '2026-11-20', explanation: 'Must be a resident of Andhra Pradesh.', explanation_te: 'ఆంధ్రప్రదేశ్ రాష్ట్ర నివాసి అయి ఉండాలి.' },
        { field: 'annualIncomeBand', operator: 'oneOf', expected: ['Under ₹1 lakh', '₹1–3 lakh', '₹3–5 lakh'], mandatory: 1, sourceUrl: 'https://aarogyasri.ap.gov.in/', verifiedAt: '2026-11-20', explanation: 'Eligible for families with annual income up to ₹5,00,000 or possessing an AP Rice Card.', explanation_te: 'వార్షిక ఆదాయం ₹5 లక్షల లోపు ఉన్న కుటుంబాలన్నీ అర్హులు.' }
      ],
      documents: [
        { name: 'Dr. YSR Aarogyasri Card / AP Rice Card', name_te: 'ఆరోగ్యశ్రీ కార్డు లేదా బియ్యం కార్డు', is_mandatory: 1, authority: 'Aarogyasri Trust', sourceUrl: 'https://aarogyasri.ap.gov.in/', verifiedAt: '2026-11-20' }
      ],
      steps: [
        { step_number: 1, title: 'Visit Network Hospital', instruction: 'Approach Aarogyamithra helpdesk at any network hospital with your health card.', instruction_te: 'ఆరోగ్యమిత్ర డెస్క్ వద్ద సంప్రదించండి.', sourceUrl: 'https://aarogyasri.ap.gov.in/', verifiedAt: '2026-11-20' }
      ]
    },
    {
      id: 'ap-cheyutha',
      name: 'YSR Cheyutha',
      name_te: 'వైఎస్సార్ చేయూత',
      government_level: 'State',
      department: 'Social Welfare Department, Government of Andhra Pradesh',
      department_te: 'సామాజిక సంక్షేమ శాఖ, ఆంధ్రప్రదేశ్ ప్రభుత్వం',
      description: 'Financial assistance of ₹18,750 per year for four years (total ₹75,000) directly to women aged 45 to 60 belonging to SC, ST, BC, and Minority communities.',
      description_te: '45 నుండి 60 సంవత్సరాల వయస్సు గల ఎస్సీ, ఎస్టీ, బీసీ, మైనారిటీ మహిళలకు ఏటా ₹18,750 చొప్పున 4 ఏళ్లలో మొత్తం ₹75,000 ఆర్థిక సాయం అందించే జీవనోపాధి పథకం.',
      purpose: 'To empower middle-aged women towards entrepreneurship and sustainable livelihood.',
      benefit: '₹75,000 in four equal annual tranches of ₹18,750.',
      benefit_te: 'ఏటా ₹18,750 చొప్పున నాలుగు విడతల్లో ₹75,000 నేరుగా బ్యాంక్ ఖాతాలో జమ.',
      category: 'Women & child',
      state: 'Andhra Pradesh',
      helpline: '1902',
      deadline: 'Annual schedule declared by Government',
      official_url: 'https://navasakam.ap.gov.in/',
      official_source_url: 'https://navasakam.ap.gov.in/',
      source_reference: 'AP Social Welfare Department guidelines for YSR Cheyutha',
      last_verified: '2026-11-20',
      criteria_complete: 1,
      is_active: 1,
      color: 'peach',
      symbol: '👩',
      criteria: [
        { field: 'state', operator: 'equals', expected: 'Andhra Pradesh', mandatory: 1, sourceUrl: 'https://navasakam.ap.gov.in/', verifiedAt: '2026-11-20', explanation: 'Must be a permanent resident of Andhra Pradesh.', explanation_te: 'ఆంధ్రప్రదేశ్ రాష్ట్ర శాశ్వత నివాసి అయి ఉండాలి.' },
        { field: 'gender', operator: 'equals', expected: 'Woman', mandatory: 1, sourceUrl: 'https://navasakam.ap.gov.in/', verifiedAt: '2026-11-20', explanation: 'Scheme is exclusively for women applicants.', explanation_te: 'కేవలం మహిళలకు మాత్రమే వర్తిస్తుంది.' },
        { field: 'age', operator: 'min', expected: 45, mandatory: 1, sourceUrl: 'https://navasakam.ap.gov.in/', verifiedAt: '2026-11-20', explanation: 'Woman must be at least 45 years of age.', explanation_te: 'కనీసం 45 సంవత్సరాలు నిండి ఉండాలి.' },
        { field: 'age', operator: 'max', expected: 60, mandatory: 1, sourceUrl: 'https://navasakam.ap.gov.in/', verifiedAt: '2026-11-20', explanation: 'Must not have completed 60 years of age.', explanation_te: '60 సంవత్సరాలకు మించకూడదు.' },
        { field: 'socialCategory', operator: 'oneOf', expected: ['SC', 'ST', 'OBC'], mandatory: 1, sourceUrl: 'https://navasakam.ap.gov.in/', verifiedAt: '2026-11-20', explanation: 'Must belong to SC, ST, or BC communities.', explanation_te: 'ఎస్సీ, ఎస్టీ, బీసీ వర్గానికి చెందినవారై ఉండాలి.' }
      ],
      documents: [
        { name: 'Caste Certificate (SC/ST/BC)', name_te: 'కుల ధృవీకరణ పత్రం', is_mandatory: 1, authority: 'Tahsildar', sourceUrl: 'https://navasakam.ap.gov.in/', verifiedAt: '2026-11-20' },
        { name: 'AP Rice Card', name_te: 'బియ్యం కార్డు', is_mandatory: 1, authority: 'Civil Supplies', sourceUrl: 'https://navasakam.ap.gov.in/', verifiedAt: '2026-11-20' }
      ],
      steps: [
        { step_number: 1, title: 'Apply at Secretariat', instruction: 'Submit application at Grama/Ward Sachivalayam.', instruction_te: 'గ్రామ/వార్డు సచివాలయంలో దరఖాస్తు చేయండి.', sourceUrl: 'https://navasakam.ap.gov.in/', verifiedAt: '2026-11-20' }
      ]
    },
    {
      id: 'ap-pension-kanuka',
      name: 'YSR Pension Kanuka (NTR Bharosa Pension)',
      name_te: 'వైఎస్సార్ పెన్షన్ కానుక / ఎన్టీఆర్ భరోసా పెన్షన్',
      government_level: 'State',
      department: 'Society for Elimination of Rural Poverty (SERP), Govt of AP',
      department_te: 'గ్రామీణ పేదరిక నిర్మూలన సంస్థ (SERP), ఆంధ్రప్రదేశ్ ప్రభుత్వం',
      description: 'Monthly social security pension of ₹4,000/month for Old Age (60+), Widows, Weavers, and up to ₹6,000 - ₹15,000 for Persons with Disabilities, delivered right at their doorstep.',
      description_te: 'వృద్ధులు (60 ఏళ్లు పైబడినవారు), వితంతువులకు నెలకు ₹4,000 మరియు దివ్యాంగులకు నెలకు ₹6,000 నుండి ₹15,000 వరకు ప్రతి నెలా 1వ తేదీన ఇంటి వద్దకే అందించే పెన్షన్ పథకం.',
      purpose: 'To ensure dignity and social security to elderly, destitute widows, and physically challenged citizens.',
      benefit: '₹4,000 per month for Old Age / Widow; ₹6,000 to ₹15,000/month for Persons with Disabilities.',
      benefit_te: 'వృద్ధులు, వితంతువులకు నెలకు ₹4,000 మరియు దివ్యాంగులకు నెలకు ₹6,000 నుండి ₹15,000 వరకు నేరుగా నగదు రూపంలో అందుతుంది.',
      category: 'Pension',
      state: 'Andhra Pradesh',
      helpline: '1902 / 0866-2410017',
      deadline: 'Applications accepted every month at Sachivalayam',
      official_url: 'https://sspensions.ap.gov.in/',
      official_source_url: 'https://sspensions.ap.gov.in/',
      source_reference: 'AP SERP, Panchayat Raj & Rural Development Department Guidelines',
      last_verified: '2026-11-20',
      criteria_complete: 1,
      is_active: 1,
      color: 'lavender',
      symbol: '👴',
      criteria: [
        { field: 'state', operator: 'equals', expected: 'Andhra Pradesh', mandatory: 1, sourceUrl: 'https://sspensions.ap.gov.in/', verifiedAt: '2026-11-20', explanation: 'Must be a permanent resident of Andhra Pradesh.', explanation_te: 'ఆంధ్రప్రదేశ్ రాష్ట్ర నివాసి అయి ఉండాలి.' },
        { field: 'bpl', operator: 'equals', expected: true, mandatory: 1, sourceUrl: 'https://sspensions.ap.gov.in/', verifiedAt: '2026-11-20', explanation: 'Must belong to BPL family holding a valid AP Rice Card.', explanation_te: 'చెల్లుబాటు అయ్యే తెల్ల రేషన్ లేదా బియ్యం కార్డు కలిగి ఉండాలి.' }
      ],
      documents: [
        { name: 'Aadhaar Card / Age Proof', name_te: 'ఆధార్ లేదా వయస్సు ధృవీకరణ పత్రం', is_mandatory: 1, authority: 'UIDAI', sourceUrl: 'https://sspensions.ap.gov.in/', verifiedAt: '2026-11-20' },
        { name: 'AP Rice Card', name_te: 'ఆంధ్రప్రదేశ్ బియ్యం కార్డు', is_mandatory: 1, authority: 'Civil Supplies', sourceUrl: 'https://sspensions.ap.gov.in/', verifiedAt: '2026-11-20' }
      ],
      steps: [
        { step_number: 1, title: 'Submit at Secretariat', instruction: 'Submit application with age/disability proof at Village/Ward Secretariat.', instruction_te: 'సచివాలయంలో దరఖాస్తును సమర్పించండి.', sourceUrl: 'https://sspensions.ap.gov.in/', verifiedAt: '2026-11-20' },
        { step_number: 2, title: 'Doorstep Delivery', instruction: 'Receive pension cash right at your home on the 1st of every month.', instruction_te: 'ప్రతి నెలా 1వ తేదీనే మీ ఇంటి వద్దకే నేరుగా పెన్షన్ అందుతుంది.', sourceUrl: 'https://sspensions.ap.gov.in/', verifiedAt: '2026-11-20' }
      ]
    },
    {
      id: 'ap-vahana-mitra',
      name: 'YSR Vahana Mitra',
      name_te: 'వైఎస్సార్ వాహన మిత్ర',
      government_level: 'State',
      department: 'Transport Department, Government of Andhra Pradesh',
      department_te: 'రవాణా శాఖ, ఆంధ్రప్రదేశ్ ప్రభుత్వం',
      description: 'Annual recurring financial assistance of ₹10,000 to self-employed auto-rickshaw, taxi, and maxi-cab driver-owners in Andhra Pradesh.',
      description_te: 'సొంతంగా ఆటో, టాక్సీ నడుపుకునే డ్రైవర్-ఓనర్లకు ఇన్సూరెన్స్ మరియు వాహన నిర్వహణ ఖర్చుల కోసం ఏటా ₹10,000 అందించే పథకం.',
      purpose: 'To ease the burden of vehicle maintenance on poor transport operators.',
      benefit: '₹10,000 per year credited directly to the driver-cum-owner\'s bank account.',
      benefit_te: 'ఏడాదికి ₹10,000 రూపాయలు నేరుగా డ్రైవర్-ఓనర్ బ్యాంక్ ఖాతాలో జమ.',
      category: 'Financial assistance',
      state: 'Andhra Pradesh',
      helpline: '1902 / 0866-2428800',
      deadline: 'Annual announcement (August - September)',
      official_url: 'https://navasakam.ap.gov.in/',
      official_source_url: 'https://navasakam.ap.gov.in/',
      source_reference: 'AP Transport Department, G.O.Ms No. 37',
      last_verified: '2026-11-20',
      criteria_complete: 1,
      is_active: 1,
      color: 'mint',
      symbol: '🛺',
      criteria: [
        { field: 'state', operator: 'equals', expected: 'Andhra Pradesh', mandatory: 1, sourceUrl: 'https://navasakam.ap.gov.in/', verifiedAt: '2026-11-20', explanation: 'Must be a permanent resident of Andhra Pradesh.', explanation_te: 'ఆంధ్రప్రదేశ్ రాష్ట్ర శాశ్వత నివాసి అయి ఉండాలి.' },
        { field: 'occupation', operator: 'oneOf', expected: ['Driver / Auto Owner', 'Self-employed', 'Daily wage worker', 'Other'], mandatory: 1, sourceUrl: 'https://navasakam.ap.gov.in/', verifiedAt: '2026-11-20', explanation: 'Must own and drive an Auto-rickshaw or Taxi.', explanation_te: 'సొంతంగా ఆటో లేదా టాక్సీ కలిగి ఉండి డ్రైవింగ్ లైసెన్స్ ఉండాలి.' }
      ],
      documents: [
        { name: 'Vehicle Registration Certificate (RC)', name_te: 'వాహన ఆర్సీ (RC)', is_mandatory: 1, authority: 'Transport Dept', sourceUrl: 'https://navasakam.ap.gov.in/', verifiedAt: '2026-11-20' },
        { name: 'Valid Driving Licence', name_te: 'డ్రైవింగ్ లైసెన్స్', is_mandatory: 1, authority: 'RTO', sourceUrl: 'https://navasakam.ap.gov.in/', verifiedAt: '2026-11-20' }
      ],
      steps: [
        { step_number: 1, title: 'Apply Online or at Sachivalayam', instruction: 'Submit RC and licence at your Grama/Ward Sachivalayam.', instruction_te: 'సచివాలయంలో ఆర్సీ మరియు లైసెన్స్ తో దరఖాస్తు చేయండి.', sourceUrl: 'https://navasakam.ap.gov.in/', verifiedAt: '2026-11-20' }
      ]
    },
    {
      id: 'ap-nethanna-nestham',
      name: 'YSR Nethanna Nestham',
      name_te: 'వైఎస్సార్ నేతన్న నేస్తం',
      government_level: 'State',
      department: 'Handlooms & Textiles Department, Government of Andhra Pradesh',
      department_te: 'చేనేత & జౌళి శాఖ, ఆంధ్రప్రదేశ్ ప్రభుత్వం',
      description: 'Annual financial support of ₹24,000 to every handloom weaver family owning a loom to upgrade equipment and purchase raw materials.',
      description_te: 'సొంతంగా మగ్గం కలిగి ఉన్న ప్రతి చేనేత కుటుంబానికి ఆధునిక పనిముట్లు, నూలు కొనుగోలు కోసం ఏటా ₹24,000 అందించే పథకం.',
      purpose: 'To revitalize traditional handloom weavers in Andhra Pradesh.',
      benefit: 'Direct financial assistance of ₹24,000 per annum deposited directly into the weaver\'s bank account.',
      benefit_te: 'ఏటా ₹24,000 రూపాయలు నేరుగా చేనేత కార్మికుడి బ్యాంక్ ఖాతాలో జమ.',
      category: 'Financial assistance',
      state: 'Andhra Pradesh',
      helpline: '1902 / 0863-2340700',
      deadline: 'National Handloom Day (August annual release)',
      official_url: 'https://navasakam.ap.gov.in/',
      official_source_url: 'https://navasakam.ap.gov.in/',
      source_reference: 'AP Handlooms and Textiles Dept, G.O.Ms No. 59',
      last_verified: '2026-11-20',
      criteria_complete: 1,
      is_active: 1,
      color: 'mint',
      symbol: '🧵',
      criteria: [
        { field: 'state', operator: 'equals', expected: 'Andhra Pradesh', mandatory: 1, sourceUrl: 'https://navasakam.ap.gov.in/', verifiedAt: '2026-11-20', explanation: 'Must be a permanent resident of Andhra Pradesh.', explanation_te: 'ఆంధ్రప్రదేశ్ రాష్ట్ర నివాసి అయి ఉండాలి.' },
        { field: 'occupation', operator: 'oneOf', expected: ['Artisan', 'Weaver / Handloom', 'Self-employed', 'Other'], mandatory: 1, sourceUrl: 'https://navasakam.ap.gov.in/', verifiedAt: '2026-11-20', explanation: 'Family must own and operate a handloom.', explanation_te: 'సొంత మగ్గం కలిగి ఉండి నేత పని చేస్తున్న కుటుంబం అయి ఉండాలి.' }
      ],
      documents: [
        { name: 'Handloom Geo-tagging Registration', name_te: 'మగ్గం జియో ట్యాగింగ్ వివరాలు', is_mandatory: 1, authority: 'Handloom Dept', sourceUrl: 'https://navasakam.ap.gov.in/', verifiedAt: '2026-11-20' },
        { name: 'AP Rice Card', name_te: 'ఆంధ్రప్రదేశ్ బియ్యం కార్డు', is_mandatory: 1, authority: 'Civil Supplies', sourceUrl: 'https://navasakam.ap.gov.in/', verifiedAt: '2026-11-20' }
      ],
      steps: [
        { step_number: 1, title: 'Loom Geo-tagging', instruction: 'Handloom officers inspect and geo-tag your operational loom.', instruction_te: 'మగ్గాన్ని జియో ట్యాగింగ్ చేయించుకోండి.', sourceUrl: 'https://navasakam.ap.gov.in/', verifiedAt: '2026-11-20' }
      ]
    }
  ]

  for (const s of allSchemes) {
    insertScheme.run(
      s.id, s.name, s.name_te, s.government_level, s.department, s.department_te,
      s.description, s.description_te, s.purpose, s.benefit, s.benefit_te,
      s.category, s.state, s.helpline, s.deadline, s.official_url, s.official_source_url,
      s.source_reference, s.last_verified, s.criteria_complete, s.is_active, s.color, s.symbol
    )

    if (s.criteria) {
      for (const c of s.criteria) {
        insertCriterion.run(
          s.id, c.field, c.operator, JSON.stringify(c.expected), c.mandatory,
          c.sourceUrl, c.verifiedAt, c.explanation, c.explanation_te
        )
      }
    }

    if (s.documents) {
      for (const d of s.documents) {
        insertDocument.run(
          s.id, d.name, d.name_te, d.is_mandatory, d.authority, d.sourceUrl, d.verifiedAt
        )
      }
    }

    if (s.steps) {
      for (const st of s.steps) {
        insertStep.run(
          s.id, st.step_number, st.title, st.instruction, st.instruction_te, st.sourceUrl, st.verifiedAt
        )
      }
    }
  }

  console.log(`Successfully seeded ${allSchemes.length} schemes into SQLite database.`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seedDatabase(true)
}
