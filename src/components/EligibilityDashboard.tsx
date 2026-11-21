import { useState } from 'react'
import { ArrowRight, BadgeCheck, CheckSquare, ExternalLink, FileCheck2, Info, ShieldAlert, ShieldCheck, X } from 'lucide-react'
import type { Scheme } from '../data/schemes'
import type { EligibilityResult, EligibilityStatus } from '../lib/eligibility'
import type { Language } from '../data/translations'
import { translations } from '../data/translations'
import { SchemeDetailModal } from './SchemeDetailModal'
import { DocumentChecklistModal } from './DocumentChecklistModal'

type Props = {
  results: EligibilityResult[]
  counts: Record<EligibilityStatus, number>
  applied: boolean
  lang?: Language
}

export function EligibilityDashboard({ results, counts, applied, lang = 'en' }: Props) {
  const t = translations[lang]

  const [filter, setFilter] = useState<'all' | EligibilityStatus>('all')
  const [selectedScheme, setSelectedScheme] = useState<Scheme | null>(null)
  const [checklistScheme, setChecklistScheme] = useState<Scheme | null>(null)

  const filters: { id: 'all' | EligibilityStatus; label: string; countKey?: EligibilityStatus; Icon: typeof BadgeCheck }[] = [
    { id: 'all', label: t.allResults, Icon: FileCheck2 },
    { id: 'appears-eligible', label: t.catA, countKey: 'appears-eligible', Icon: BadgeCheck },
    { id: 'needs-verification', label: t.catB, countKey: 'needs-verification', Icon: ShieldAlert },
    { id: 'does-not-meet', label: t.catC, countKey: 'does-not-meet', Icon: X },
  ]

  const statusLabels: Record<EligibilityStatus, string> = {
    'appears-eligible': lang === 'te' ? 'అర్హత ఉంది (Appears Eligible)' : 'Appears Eligible',
    'needs-verification': lang === 'te' ? 'అదనపు ధృవీకరణ అవసరం (Needs Verification)' : 'Additional verification required',
    'does-not-meet': lang === 'te' ? 'అర్హత నిబంధనలు సరిపోలడం లేదు (Does Not Meet)' : 'Does not meet verified conditions',
  }

  const shownResults = results.filter((result) => filter === 'all' || result.status === filter)

  return (
    <section className="eligibility-dashboard" id="eligibility-dashboard" aria-labelledby="eligibility-title">
      <div className="eligibility-heading">
        <div>
          <p className="section-kicker">{lang === 'te' ? 'స్మార్ట్ విశ్లేషణ ఫలితాలు' : 'PRELIMINARY PROFILE CHECK'}</p>
          <h2 id="eligibility-title">{applied ? t.resultsTitle : (lang === 'te' ? 'సంక్షేమ పథకాల అన్వేషణ' : 'Explore Potential Schemes')}</h2>
          <p>{t.resultsSubtitle}</p>
        </div>
        <span className="preliminary-badge">
          <ShieldCheck size={15} /> {lang === 'te' ? 'ప్రాథమిక పరిశీలన మాత్రమే' : 'Preliminary match only'}
        </span>
      </div>

      {/* 3 Categories + All Filter Buttons */}
      <div className="eligibility-counts" role="group" aria-label="Filter results by eligibility status">
        {filters.map(({ id, label, Icon }) => {
          const count = id === 'all' ? results.length : counts[id]
          const isSelected = filter === id
          return (
            <button
              key={id}
              type="button"
              className={`eligibility-count ${isSelected ? 'selected' : ''}`}
              onClick={() => setFilter(id)}
              aria-pressed={isSelected}
            >
              <span className={`count-icon ${id}`}><Icon size={16} /></span>
              <span className="count-copy">
                <b>{count}</b>
                <small>{label}</small>
              </span>
            </button>
          )
        })}
      </div>

      {/* Filter Category Explanation Banner */}
      {filter !== 'all' && (
        <div className={`filter-explanation-banner ${filter}`}>
          <Info size={15} />
          <span>
            {filter === 'appears-eligible' && t.catADesc}
            {filter === 'needs-verification' && t.catBDesc}
            {filter === 'does-not-meet' && t.catCDesc}
          </span>
        </div>
      )}

      {/* Results List */}
      <div className="eligibility-list">
        {shownResults.map((result) => {
          const { scheme, status, matched, failed, missing, unverified } = result

          const schemeName = lang === 'te' && scheme.nameTe ? scheme.nameTe : scheme.name
          const department = lang === 'te' && scheme.departmentTe ? scheme.departmentTe : scheme.department
          const benefit = lang === 'te' && scheme.benefitTe ? scheme.benefitTe : scheme.benefit

          const reason = status === 'appears-eligible'
            ? (lang === 'te' ? 'అధికారిక నిబంధనల ప్రకారం మీరు ఈ పథకానికి అర్హులై ఉన్నారు. దరఖాస్తు చేసే ముందు మార్గదర్శకాలను తనిఖీ చేయండి.' : 'All recorded mandatory eligibility conditions are satisfied based on your profile.')
            : status === 'does-not-meet'
              ? (lang === 'te' ? 'ఈ క్రింది తప్పనిసరి నిబంధనలు సరిపోలడం లేదు: ' : 'One or more mandatory eligibility conditions are not satisfied: ') +
                failed.filter((c) => c.mandatory).map((c) => lang === 'te' && c.explanationTe ? c.explanationTe : c.explanation).join(' ')
              : scheme.criteria.length === 0
                ? (lang === 'te' ? 'అధికారిక నిబంధనలు ఇంకా ధృవీకరించబడలేదు. కేటగిరీ ఆధారంగా అర్హత నిర్ణయించబడదు.' : 'Scheme-specific eligibility rules have not yet been transcribed into SchemeSathi.')
                : (lang === 'te' ? 'మరికొన్ని వివరాలు అవసరం: ' : 'Additional verification needed: ') +
                  ([...missing, ...unverified].map((c) => lang === 'te' && c.explanationTe ? c.explanationTe : c.explanation).join(' ') || 'review the source details.')

          return (
            <article className={`eligibility-card status-border-${status}`} key={scheme.id}>
              <div className="eligibility-card-main">
                <div className="eligibility-top-badge-row">
                  <span className={`eligibility-status ${status}`}>
                    <ShieldCheck size={14} /> {statusLabels[status]}
                  </span>
                  <span className="gov-level-tag">{scheme.governmentLevel}</span>
                  {scheme.state !== 'All India' && <span className="state-badge-tag">{scheme.state}</span>}
                </div>

                <p className="eligibility-category">{scheme.category.toUpperCase()} · {department}</p>
                <h3>{schemeName}</h3>

                {benefit && (
                  <div className="card-key-benefit">
                    <span className="benefit-label">{t.keyBenefit}:</span>
                    <strong>{benefit}</strong>
                  </div>
                )}

                <div className="eligibility-evaluation-box">
                  <p className="eligibility-reason">{reason}</p>
                  {matched.length > 0 && (
                    <p className="criteria-note matched">
                      <BadgeCheck size={14} />
                      <span>{matched.length} {lang === 'te' ? 'నిబంధనలు సరిపోయాయి' : 'conditions match your profile'}: {matched.map(m => m.field).join(', ')}</span>
                    </p>
                  )}
                  {failed.length > 0 && (
                    <p className="criteria-note failed">
                      <X size={14} />
                      <span>{failed.length} {lang === 'te' ? 'నిబంధనలు సరిపోలలేదు' : 'conditions not met'}: {failed.map(f => f.field).join(', ')}</span>
                    </p>
                  )}
                </div>

                <div className="scheme-meta-footer">
                  <span className="scheme-verified">
                    {scheme.lastVerified ? `${lang === 'te' ? 'చివరి పరిశీలన:' : 'Last verified:'} ${scheme.lastVerified}` : 'Preliminary data'}
                  </span>
                  {scheme.helpline && (
                    <span className="scheme-helpline">📞 {scheme.helpline}</span>
                  )}
                </div>
              </div>

              <div className="eligibility-card-actions">
                <button
                  type="button"
                  className="details-button"
                  onClick={() => setSelectedScheme(scheme)}
                >
                  {t.viewDetails} <ArrowRight size={14} />
                </button>

                <button
                  type="button"
                  className="checklist-button"
                  onClick={() => setChecklistScheme(scheme)}
                >
                  <CheckSquare size={13} /> {t.checklistBtn}
                </button>

                <a
                  href={scheme.officialUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="source-link"
                >
                  {t.officialPortal} <ExternalLink size={12} />
                </a>
              </div>
            </article>
          )
        })}

        {shownResults.length === 0 && (
          <div className="career-empty">
            <ShieldAlert size={22} />
            <p>{lang === 'te' ? 'ఈ వర్గంలో ప్రస్తుతం పథకాలు ఏవీ లేవు.' : 'No schemes match this category based on current profile inputs.'}</p>
          </div>
        )}
      </div>

      <p className="eligibility-disclaimer">
        <ShieldAlert size={15} />
        <span>{t.disclaimer}</span>
      </p>

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
