import { useState } from 'react'
import { Landmark, Bookmark, Menu, X, Languages, Lock } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import type { Language } from '../data/translations'
import { translations } from '../data/translations'

type Props = {
  lang: Language
  onToggleLang: (lang: Language) => void
  savedCount: number
  onToggleSavedView: () => void
  isSavedViewActive: boolean
  onOpenAdmin: () => void
}

export function Navbar({
  lang,
  onToggleLang,
  savedCount,
  onToggleSavedView,
  isSavedViewActive,
  onOpenAdmin,
}: Props) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const t = translations[lang]
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const handleLogout = async () => {
    await signOut()
    setMobileMenuOpen(false)
    navigate('/', { replace: true })
  }

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
        aria-label="Toggle navigation"
      >
        {mobileMenuOpen ? <X size={21} /> : <Menu size={21} />}
      </button>

      {/* Main Navigation Links */}
      <nav className={`main-nav ${mobileMenuOpen ? 'is-open' : ''}`} aria-label="Main navigation">
        <a href="#eligibility-checker" onClick={() => setMobileMenuOpen(false)}>
          {t.navFinder}
        </a>
        <a href="#discover" onClick={() => setMobileMenuOpen(false)}>
          {t.navDiscover}
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

        {/* Admin Portal Button */}
        <button
          type="button"
          className="admin-nav-button"
          onClick={() => {
            onOpenAdmin()
            setMobileMenuOpen(false)
          }}
        >
          <Lock size={14} /> {t.navAdmin}
        </button>

        {user ? (
          <div className="account-nav">
            <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)}>Dashboard</Link>
            <Link to="/profile" onClick={() => setMobileMenuOpen(false)}>Profile</Link>
            <button type="button" onClick={handleLogout}>Logout</button>
          </div>
        ) : (
          <div className="account-nav guest">
            <Link to="/login" onClick={() => setMobileMenuOpen(false)}>Login</Link>
            <Link className="register-link" to="/register" onClick={() => setMobileMenuOpen(false)}>Register</Link>
          </div>
        )}

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
