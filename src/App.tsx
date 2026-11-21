import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ArrowDownRight, ArrowRight, Check, ExternalLink, HandHeart, Landmark, ShieldCheck, Sparkles, Users } from 'lucide-react'
import { onAuthStateChanged, type User } from '@firebase/auth'
import { schemes as initialSchemes, type Scheme } from './data/schemes'
import { evaluateSchemes, filterSchemesForProfile, type CitizenProfile } from './lib/eligibility'
import { translations, type Language } from './data/translations'
import { Navbar } from './components/Navbar'
import { EligibilityForm, type FormProfileData } from './components/EligibilityForm'
import { EligibilityDashboard } from './components/EligibilityDashboard'
import { ExploreSchemes } from './components/ExploreSchemes'
import { HowItWorks } from './components/HowItWorks'
import { WhyChooseSection } from './components/WhyChooseSection'
import { FAQSection } from './components/FAQSection'
import { AdminPortal } from './components/AdminPortal'
import { AuthDialog } from './components/AuthDialog'
import { firebaseAuth } from './lib/firebase'
import './App.css'

const initialProfileData: FormProfileData = {
  age: '',
  income: 'Any income',
  occupation: 'Any occupation',
  state: 'All India',
  district: '',
  residence: '',
  gender: '',
  maritalStatus: '',
  qualification: '',
  currentStatus: '',
  familySize: '',
  bplStatus: '',
  socialCategory: '',
  disabilityStatus: '',
  farmerStatus: '',
  housingStatus: '',
}

function App() {
  const [lang, setLang] = useState<Language>('en')
  const t = translations[lang]

  const [schemesList, setSchemesList] = useState<Scheme[]>(() => {
    try {
      const saved = localStorage.getItem('schemesathi_custom_schemes')
      return saved ? JSON.parse(saved) : initialSchemes
    } catch {
      return initialSchemes
    }
  })

  const [profileData, setProfileData] = useState<FormProfileData>(initialProfileData)
  const [applied, setApplied] = useState(false)
  const [saved, setSaved] = useState<string[]>(() => {
    try {
      const savedItems = localStorage.getItem('schemesathi_saved_ids')
      return savedItems ? JSON.parse(savedItems) : []
    } catch {
      return []
    }
  })
  const [showSavedView, setShowSavedView] = useState(false)
  const [adminOpen, setAdminOpen] = useState(false)
  const [authDialogOpen, setAuthDialogOpen] = useState(false)
  const [authUser, setAuthUser] = useState<User | null>(null)

  useEffect(() => {
    if (!firebaseAuth) return
    return onAuthStateChanged(firebaseAuth, setAuthUser)
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem('schemesathi_saved_ids', JSON.stringify(saved))
    } catch {}
  }, [saved])

  const handleProfileChange = (key: keyof FormProfileData, value: string) => {
    setProfileData((prev) => ({ ...prev, [key]: value }))
  }

  const handleResetForm = () => {
    setProfileData(initialProfileData)
    setApplied(false)
  }

  const handleToggleSaved = (id: string) => {
    setSaved((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    )
  }

  const handleUpdateSchemes = (updated: Scheme[]) => {
    setSchemesList(updated)
    try {
      localStorage.setItem('schemesathi_custom_schemes', JSON.stringify(updated))
    } catch {}
  }

  // Construct structured CitizenProfile for eligibility engine
  const profile: CitizenProfile = useMemo(() => {
    return {
      ...(profileData.age ? { age: Number(profileData.age) } : {}),
      ...(profileData.income !== 'Any income' ? { annualIncomeBand: profileData.income } : {}),
      ...(profileData.occupation !== 'Any occupation' ? { occupation: profileData.occupation } : {}),
      ...(profileData.state !== 'All India' ? { state: profileData.state } : {}),
      ...(profileData.district.trim() ? { district: profileData.district.trim() } : {}),
      ...(profileData.residence ? { residence: profileData.residence } : {}),
      ...(profileData.gender ? { gender: profileData.gender } : {}),
      ...(profileData.qualification ? { education: profileData.qualification } : {}),
      ...(profileData.currentStatus ? { currentStatus: profileData.currentStatus } : {}),
      ...(profileData.familySize ? { familySize: Number(profileData.familySize) } : {}),
      ...(profileData.bplStatus ? { bpl: profileData.bplStatus === 'Yes' } : {}),
      ...(profileData.socialCategory ? { socialCategory: profileData.socialCategory } : {}),
      ...(profileData.disabilityStatus ? { disability: profileData.disabilityStatus === 'Yes' } : {}),
      ...(profileData.farmerStatus ? { farmer: profileData.farmerStatus === 'Yes' } : {}),
      ...(profileData.housingStatus ? { housingStatus: profileData.housingStatus } : {}),
      ...(profileData.maritalStatus ? { maritalStatus: profileData.maritalStatus } : {}),
    }
  }, [profileData])

  // Run Rule-Based Eligibility Engine
  const eligibilityResults = useMemo(() => {
    const relevantSchemes = filterSchemesForProfile(schemesList, profile)
    return evaluateSchemes(relevantSchemes, profile)
  }, [schemesList, profile])

  const eligibilityCounts = useMemo(() => {
    return {
      'appears-eligible': eligibilityResults.filter((r) => r.status === 'appears-eligible').length,
      'needs-verification': eligibilityResults.filter((r) => r.status === 'needs-verification').length,
      'does-not-meet': eligibilityResults.filter((r) => r.status === 'does-not-meet').length,
    }
  }, [eligibilityResults])

  const handleFindMatches = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setApplied(true)
    setShowSavedView(false)
    window.requestAnimationFrame(() => {
      document.getElementById('eligibility-dashboard')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  const handleScrollToChecker = () => {
    document.getElementById('eligibility-checker')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="app-shell">
      {/* 1. Header & Navigation */}
      <Navbar
        lang={lang}
        onToggleLang={setLang}
        savedCount={saved.length}
        onToggleSavedView={() => {
          setShowSavedView(!showSavedView)
          document.getElementById('discover')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }}
        isSavedViewActive={showSavedView}
        onOpenAdmin={() => setAdminOpen(true)}
      />

      <main id="home">
        {/* 2. Welcoming Hero Section */}
        <section className="hero-section">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="live-dot" /> {t.heroEyebrow}
            </div>

            <h1>
              {t.heroTitle1}<br />
              <span>{t.heroTitle2}</span>
            </h1>

            <p className="hero-description">
              {t.heroSubtitle}
            </p>

            <div className="hero-actions-row">
              <button
                type="button"
                className="btn-primary hero-cta-btn"
                onClick={handleScrollToChecker}
              >
                {t.startCheckBtn} <ArrowRight size={17} />
              </button>

              <a href="#discover" className="btn-secondary hero-secondary-btn">
                {t.exploreSchemesBtn}
              </a>
            </div>

            <div className="hero-proof">
              <span className="proof-icon"><ShieldCheck size={16} /></span>
              <span>{t.heroBadge1}</span>
              <i />
              <ShieldCheck size={15} />
              <span>{t.heroBadge2}</span>
              <i />
              <Users size={15} />
              <span>{t.heroBadge3}</span>
            </div>

            <ArrowDownRight className="hero-arrow" size={40} strokeWidth={1.3} />
          </div>

          <div className="hero-visual" aria-label="Illustration of community empowerment and welfare benefits">
            <div className="visual-sun" />
            <div className="visual-arch" />
            <div className="visual-land land-back" />
            <div className="visual-land land-front" />

            <div className="sun-stamp">
              <Sparkles size={16} />
              <span>
                RIGHT SUPPORT<br />
                RIGHT TIME
              </span>
            </div>

            <div className="visual-person person-one">
              <span className="person-head" />
              <span className="person-body" />
            </div>
            <div className="visual-person person-two">
              <span className="person-head" />
              <span className="person-body" />
            </div>
            <div className="visual-person person-three">
              <span className="person-head" />
              <span className="person-body" />
            </div>

            <div className="visual-plant plant-one">🌱</div>
            <div className="visual-plant plant-two">🌾</div>

            <div className="benefit-float">
              <span><HandHeart size={20} /></span>
              <div>
                <b>{lang === 'te' ? 'సంక్షేమ పథకాలు' : 'Support, Simplified'}</b>
                <small>{lang === 'te' ? 'ప్రతి పౌరుడి కోసం' : 'Made for every citizen'}</small>
              </div>
              <Check size={17} />
            </div>
          </div>
        </section>

        {/* 3. User Registration and Profile Information Form */}
        <EligibilityForm
          lang={lang}
          profileData={profileData}
          onChange={handleProfileChange}
          onSubmit={handleFindMatches}
          onReset={handleResetForm}
        />

        {/* 4. Scheme Results Dashboard (Category A, B, C) */}
        <EligibilityDashboard
          results={eligibilityResults}
          counts={eligibilityCounts}
          applied={applied}
          lang={lang}
        />

        {/* 5. Comprehensive Scheme Catalog & Explorer */}
        <ExploreSchemes
          schemes={schemesList}
          lang={lang}
          saved={saved}
          onToggleSaved={handleToggleSaved}
        />

        {/* 6. How It Works Section */}
        <HowItWorks lang={lang} />

        {/* 7. Why Choose SchemeSathi */}
        <WhyChooseSection lang={lang} />

        {/* 8. Frequently Asked Questions */}
        <FAQSection lang={lang} />
      </main>

      {/* 9. Comprehensive Official Footer */}
      <footer className="footer-container">
        <div className="footer-top-row">
          <div>
            <a className="brand footer-brand" href="#home">
              <span className="brand-mark"><Landmark size={18} /></span>
              <span>scheme<span className="brand-light">sathi</span></span>
            </a>
            <p style={{ marginTop: '8px', color: '#657766', fontSize: '12px' }}>
              {lang === 'te'
                ? 'భారతీయ పౌరుల సంక్షేమ పథకాల అన్వేషణకు నమ్మకమైన డిజిటల్ మార్గదర్శి.'
                : 'Making Central and State Government public welfare benefits discoverable, accessible, and understandable.'}
            </p>
          </div>

          <div className="footer-official-links">
            <span style={{ fontSize: '11px', color: '#889589', fontWeight: 600 }}>
              {lang === 'te' ? 'అధికారిక ప్రభుత్వ పోర్టల్స్:' : 'Official Government Portals:'}
            </span>
            <a href="https://www.myscheme.gov.in/" target="_blank" rel="noreferrer">
              myScheme.gov.in <ExternalLink size={12} />
            </a>
            <a href="https://www.india.gov.in/" target="_blank" rel="noreferrer">
              india.gov.in <ExternalLink size={12} />
            </a>
            <a href="https://www.ap.gov.in/" target="_blank" rel="noreferrer">
              ap.gov.in (Andhra Pradesh) <ExternalLink size={12} />
            </a>
          </div>
        </div>

        <div className="footer-bottom-disclaimer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={14} color="#557c5a" />
            <span>
              {lang === 'te'
                ? 'స్కీమ్‌సాథి ఒక స్వతంత్ర సమాచార వేదిక. తుది ఆమోదం అధికారిక ప్రభుత్వ పోర్టల్స్ మరియు సంబంధిత శాఖల ద్వారా మాత్రమే జరుగుతుంది.'
                : 'SchemeSathi is an independent civic information platform. Final eligibility is determined by the competent government authority.'}
            </span>
          </div>
          <span>INDEPENDENT CITIZEN GUIDE · © 2026 SCHEMESATHI</span>
        </div>
      </footer>

      {/* 10. Administrator Dashboard Modal */}
      {adminOpen && (
        <AdminPortal
          schemes={schemesList}
          lang={lang}
          onClose={() => setAdminOpen(false)}
          onUpdateSchemes={handleUpdateSchemes}
        />
      )}

      {/* Auth Dialog (Firebase / optional sign in) */}
      {authDialogOpen && (
        <AuthDialog user={authUser} onClose={() => setAuthDialogOpen(false)} />
      )}
    </div>
  )
}

export default App
