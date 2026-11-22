import { useState } from 'react'
import { Landmark, Bookmark, Menu, X, Languages } from 'lucide-react'
import type { Language } from '../data/translations'
import { translations } from '../data/translations'

type Props = {
  lang: Language
  onToggleLang: (lang: Language) => void
  savedCount: number
  onToggleSavedView: () => void
  isSavedViewActive: boolean
}

export function Navbar({
  lang,
  onToggleLang,
  savedCount,
  onToggleSavedView,
  isSavedViewActive,
}: Props) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const t = translations[lang]

  return (
    <header className="topbar">
      <a className="brand" href="#home" aria-label="SchemeSathi home">
        <span className="brand-mark">
          <Landmark size={21} strokeWidth={2.2} />
        </span>
        <span>
          scheme<span className="brand-light">sathi</span>
          <small>{t.brandSub}</small>
        </span>
      </a>

      {/* Mobile Toggle Button */}
      <button
        className="mobile-menu"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        aria-label={lang === 'te' ? 'నావిగేషన్ టోగుల్ చేయండి' : 'Toggle navigation'}
        aria-expanded={mobileMenuOpen}
        aria-controls="main-navigation"
      >
        {mobileMenuOpen ? <X size={21} /> : <Menu size={21} />}
      </button>

      {/* Main Navigation Links */}
      <nav id="main-navigation" className={`main-nav ${mobileMenuOpen ? 'is-open' : ''}`} aria-label="Main navigation">
        <a href="#eligibility-checker" onClick={() => setMobileMenuOpen(false)}>
          {t.navFinder}
        </a>
        <a href="#discover" onClick={() => setMobileMenuOpen(false)}>
          {t.navDiscover}
        </a>
        <a href="#dashboard" onClick={() => setMobileMenuOpen(false)}>
          {lang === 'te' ? 'డాష్‌బోర్డ్' : 'Dashboard'}
        </a>
        <a href="#live-updates" onClick={() => setMobileMenuOpen(false)}>
          {lang === 'te' ? 'తాజా సమాచారం' : 'Live updates'}
        </a>
        <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)}>
          {t.navHowItWorks}
        </a>
        <a href="#faq" onClick={() => setMobileMenuOpen(false)}>
          {t.navFaq}
        </a>

        {/* Saved Schemes Pill */}
        <button
          type="button"
          className={`saved-nav ${isSavedViewActive ? 'active' : ''}`}
          onClick={() => {
            onToggleSavedView()
            setMobileMenuOpen(false)
          }}
          title="View Saved Schemes"
        >
          <Bookmark size={15} />
          <span>{t.saved}</span>
          <span className="saved-count-bubble">{savedCount}</span>
        </button>

        {/* Language Switcher Toggle */}
        <div className="language-switcher">
          <Languages size={15} />
          <button
            type="button"
            className={`lang-btn ${lang === 'en' ? 'active' : ''}`}
            onClick={() => onToggleLang('en')}
          >
            English
          </button>
          <span className="lang-sep">|</span>
          <button
            type="button"
            className={`lang-btn ${lang === 'te' ? 'active' : ''}`}
            onClick={() => onToggleLang('te')}
          >
            తెలుగు
          </button>
        </div>
      </nav>
    </header>
  )
}
