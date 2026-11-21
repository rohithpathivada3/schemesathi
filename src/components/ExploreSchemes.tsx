import { useState, useMemo } from 'react'
import { Search, Bookmark, ExternalLink, ArrowDownRight, Wallet, ArrowRight, CheckSquare, Sparkles } from 'lucide-react'
import type { Scheme } from '../data/schemes'
import type { Language } from '../data/translations'
import { translations } from '../data/translations'
import { SchemeDetailModal } from './SchemeDetailModal'
import { DocumentChecklistModal } from './DocumentChecklistModal'

type Props = {
  schemes: Scheme[]
  lang: Language
  saved: string[]
  onToggleSaved: (id: string) => void
}

const categories = [
  'All schemes',
  'Agriculture',
  'Health',
  'Education',
  'Pension',
  'Business',
  'Housing & energy',
  'Women & child',
  'Financial assistance'
]

export function ExploreSchemes({ schemes, lang, saved, onToggleSaved }: Props) {
  const t = translations[lang]

  const [category, setCategory] = useState('All schemes')
  const [selectedState, setSelectedState] = useState('all')
  const [search, setSearch] = useState('')
  const [showSavedOnly, setShowSavedOnly] = useState(false)
  const [selectedScheme, setSelectedScheme] = useState<Scheme | null>(null)
  const [checklistScheme, setChecklistScheme] = useState<Scheme | null>(null)

  const visibleSchemes = useMemo(() => {
    const q = search.trim().toLowerCase()
    return schemes.filter((s) => {
      const catMatches = category === 'All schemes' || s.category === category
      const stateMatches = selectedState === 'all' || s.state === selectedState || (selectedState === 'Central' && s.state === 'All India')
      const savedMatches = !showSavedOnly || saved.includes(s.id)
      const text = `${s.name} ${s.nameTe || ''} ${s.department} ${s.departmentTe || ''} ${s.description} ${s.category} ${s.tags.join(' ')}`.toLowerCase()
      const searchMatches = !q || text.includes(q)
      return catMatches && stateMatches && savedMatches && searchMatches && s.isActive !== false
    })
  }, [schemes, category, selectedState, search, showSavedOnly, saved])

  return (
    <section className="discover-section" id="discover">
      <div className="section-title-row">
        <div>
          <p className="section-kicker"><Sparkles size={14} /> {lang === 'te' ? 'సంక్షేమ పథకాల కేటలాగ్' : 'DISCOVER GOVERNMENT SCHEMES'}</p>
          <h2>{showSavedOnly ? (lang === 'te' ? 'మీరు భద్రపరిచిన పథకాలు' : 'Your Saved Schemes') : t.exploreSchemesBtn}</h2>
          <p className="results-subtitle">
            {lang === 'te'
              ? 'కేంద్ర మరియు ఆంధ్రప్రదేశ్ రాష్ట్ర ప్రభుత్వ పథకాలను అన్వేషించండి'
              : 'Browse active Central and State Government schemes across agriculture, health, education, and livelihood.'}
          </p>
        </div>

        <div className="result-count">
          <span>{visibleSchemes.length.toString().padStart(2, '0')}</span>
          <small>{lang === 'te' ? 'పథకాలు\nఅందుబాటులో ఉన్నాయి' : 'SCHEMES\nAVAILABLE'}</small>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="filter-toolbar-container">
        <div className="category-tabs" role="tablist" aria-label="Scheme categories">
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={category === item}
              className={`category-tab ${category === item ? 'selected' : ''}`}
              onClick={() => { setCategory(item); setShowSavedOnly(false) }}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="filter-controls-row">
          <div className="state-pill-selector">
            <button
              type="button"
              className={`state-chip ${selectedState === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedState('all')}
            >
              All India & States
            </button>
            <button
              type="button"
              className={`state-chip ap-chip ${selectedState === 'Andhra Pradesh' ? 'active' : ''}`}
              onClick={() => setSelectedState('Andhra Pradesh')}
            >
              🌴 Andhra Pradesh Schemes
            </button>
            <button
              type="button"
              className={`state-chip ${selectedState === 'Central' ? 'active' : ''}`}
              onClick={() => setSelectedState('Central')}
            >
              🏛️ Central Schemes
            </button>
          </div>

          <label className="search-box">
            <Search size={16} />
            <input
              type="search"
              placeholder={lang === 'te' ? 'పథకాల పేరు లేదా శాఖతో శోధించండి...' : 'Search schemes, keywords, dept...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
        </div>
      </div>

      {/* Schemes Grid */}
      {visibleSchemes.length > 0 ? (
        <div className="scheme-grid">
          {visibleSchemes.map((scheme, index) => {
            const isSaved = saved.includes(scheme.id)
            const schemeName = lang === 'te' && scheme.nameTe ? scheme.nameTe : scheme.name
            const department = lang === 'te' && scheme.departmentTe ? scheme.departmentTe : scheme.department
            const description = lang === 'te' && scheme.descriptionTe ? scheme.descriptionTe : scheme.description
            const benefit = lang === 'te' && scheme.benefitTe ? scheme.benefitTe : scheme.benefit

            return (
              <article
                className="scheme-card"
                key={scheme.id}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="card-topline">
                  <span className={`scheme-symbol ${scheme.color}`}>{scheme.symbol}</span>
                  <div className="card-badges">
                    <span className="gov-pill">{scheme.governmentLevel}</span>
                    {scheme.state !== 'All India' && <span className="state-badge-pill">{scheme.state}</span>}
                  </div>
                  <button
                    className={`bookmark-button ${isSaved ? 'is-saved' : ''}`}
                    aria-label={isSaved ? `Remove ${schemeName}` : `Save ${schemeName}`}
                    onClick={() => onToggleSaved(scheme.id)}
                  >
                    <Bookmark size={17} fill={isSaved ? 'currentColor' : 'none'} />
                  </button>
                </div>

                <div className="scheme-category">{scheme.category.toUpperCase()}</div>
                <h3>{schemeName}</h3>
                <p className="scheme-department">{department}</p>
                <p className="scheme-description">{description}</p>

                <div className="benefit-box">
                  <Wallet size={16} />
                  <div>
                    <small>{t.keyBenefit}</small>
                    <strong>{benefit ?? 'Official benefit guidelines apply'}</strong>
                  </div>
                  <ArrowDownRight size={16} />
                </div>

                <div className="card-tags">
                  {scheme.tags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>

                <div className="card-footer-actions">
                  <button
                    type="button"
                    className="card-details-btn"
                    onClick={() => setSelectedScheme(scheme)}
                  >
                    {t.viewDetails}
                  </button>

                  <button
                    type="button"
                    className="card-checklist-btn"
                    onClick={() => setChecklistScheme(scheme)}
                    title="Interactive Document Checklist"
                  >
                    <CheckSquare size={13} /> {t.checklistBtn}
                  </button>

                  <a
                    href={scheme.officialUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="card-external-link"
                    aria-label={`Official portal for ${schemeName}`}
                  >
                    <ExternalLink size={13} />
                  </a>
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <div className="empty-state">
          <span><Search size={28} /></span>
          <h3>{lang === 'te' ? 'ఎటువంటి పథకాలు కనుగొనబడలేదు' : 'No schemes match your criteria'}</h3>
          <p>{lang === 'te' ? 'వేరే కేటగిరీ లేదా శోధన పదాన్ని ప్రయత్నించండి.' : 'Try adjusting your search terms or clearing the active filters.'}</p>
          <button
            type="button"
            className="btn-primary"
            onClick={() => { setSearch(''); setCategory('All schemes'); setSelectedState('all'); setShowSavedOnly(false) }}
          >
            {lang === 'te' ? 'అన్ని పథకాలను చూపించు' : 'See All Schemes'} <ArrowRight size={15} />
          </button>
        </div>
      )}

      {/* 12-point Scheme Detail Modal */}
      {selectedScheme && (
        <SchemeDetailModal
          scheme={selectedScheme}
          lang={lang}
          onClose={() => setSelectedScheme(null)}
          onOpenChecklist={() => {
            const s = selectedScheme
            setSelectedScheme(null)
            setChecklistScheme(s)
          }}
        />
      )}

      {/* Interactive Document Checklist Modal */}
      {checklistScheme && (
        <DocumentChecklistModal
          scheme={checklistScheme}
          lang={lang}
          onClose={() => setChecklistScheme(null)}
        />
      )}
    </section>
  )
}
