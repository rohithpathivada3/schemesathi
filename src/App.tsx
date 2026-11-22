import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ArrowDownRight, ArrowRight, Check, ExternalLink, HandHeart, Landmark, ShieldCheck, Sparkles, Users } from 'lucide-react'
import { Navigate, Routes, Route } from 'react-router-dom'
import { schemes as initialSchemes, type Scheme } from './data/schemes'
import { evaluateSchemes, filterSchemesForProfile, type CitizenProfile } from './lib/eligibility'
import { translations, type Language } from './data/translations'
import { schemeMatchesDomains, type DiscoveryDomainId } from './lib/domainMatching'
import { loadDomainPreferences, saveDomainPreferences } from './lib/domainPreferences'
import { loadRecentlyViewed, saveRecentlyViewed } from './lib/localActivity'
import { Navbar } from './components/Navbar'
import { EligibilityForm, type FormProfileData } from './components/EligibilityForm'
import { EligibilityDashboard } from './components/EligibilityDashboard'
import { ExploreSchemes } from './components/ExploreSchemes'
import { PersonalizedDashboard } from './components/PersonalizedDashboard'
import { HowItWorks } from './components/HowItWorks'
import { WhyChooseSection } from './components/WhyChooseSection'
import { FAQSection } from './components/FAQSection'
import { AdminPortal } from './components/AdminPortal'
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

  const [schemesList] = useState<Scheme[]>(() => {
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
  const [domainPreferences, setDomainPreferences] = useState(loadDomainPreferences)
  const selectedDomainIds = domainPreferences.selectedDomainIds
  const [recentlyViewed, setRecentlyViewed] = useState(() =>
    loadRecentlyViewed(schemesList.map((scheme) => scheme.id))
  )

  useEffect(() => {
    try {
      localStorage.setItem('schemesathi_saved_ids', JSON.stringify(saved))
    } catch {}
  }, [saved])

  const handleSelectAllDomains = () => {
    const persistenceAvailable = saveDomainPreferences([])
    setDomainPreferences((current) => ({
      ...current,
      selectedDomainIds: [],
      persistenceAvailable,
    }))
  }

  const handleToggleDomain = (domainId: DiscoveryDomainId) => {
    const nextDomainIds = selectedDomainIds.includes(domainId)
      ? selectedDomainIds.filter((id) => id !== domainId)
      : [...selectedDomainIds, domainId]
    const persistenceAvailable = saveDomainPreferences(nextDomainIds)
    setDomainPreferences((current) => ({
      ...current,
      selectedDomainIds: nextDomainIds,
      persistenceAvailable,
    }))
  }

  const domainFilteredSchemes = useMemo(
    () => schemesList.filter((scheme) => schemeMatchesDomains(scheme, selectedDomainIds)),
    [schemesList, selectedDomainIds]
  )

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

  const handleViewScheme = (scheme: Scheme) => {
    const validSchemeIds = schemesList.map((item) => item.id)
    const nextSchemeIds = [scheme.id, ...recentlyViewed.schemeIds.filter((id) => id !== scheme.id)]
    const persistenceAvailable = saveRecentlyViewed(nextSchemeIds, validSchemeIds)
    setRecentlyViewed({
      schemeIds: nextSchemeIds.slice(0, 5),
      persistenceAvailable,
    })
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
    const relevantSchemes = filterSchemesForProfile(domainFilteredSchemes, profile)
    return evaluateSchemes(relevantSchemes, profile)
  }, [domainFilteredSchemes, profile])

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
    <Routes>
      <Route path="/admin" element={<AdminPortal />} />
      <Route path="/" element={
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

        <PersonalizedDashboard
          schemes={domainFilteredSchemes}
          savedSchemeIds={saved}
          recentlyViewedIds={recentlyViewed.schemeIds}
          recentStorageAvailable={recentlyViewed.persistenceAvailable}
          selectedDomainIds={selectedDomainIds}
          lang={lang}
        />

        {/* 5. Comprehensive Scheme Catalog & Explorer */}
        <ExploreSchemes
          schemes={schemesList}
          lang={lang}
          saved={saved}
          onToggleSaved={handleToggleSaved}
          selectedDomainIds={selectedDomainIds}
          onToggleDomain={handleToggleDomain}
          onSelectAllDomains={handleSelectAllDomains}
          domainPreferencePersistenceAvailable={domainPreferences.persistenceAvailable}
          onViewScheme={handleViewScheme}
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

    </div>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
