import { useState, useEffect } from 'react'
import { Check, CheckSquare, ExternalLink, FileCheck2, Info, Printer, X } from 'lucide-react'
import type { Scheme } from '../data/schemes'
import type { Language } from '../data/translations'

type Props = {
  scheme: Scheme
  lang: Language
  onClose: () => void
}

export function DocumentChecklistModal({ scheme, lang, onClose }: Props) {
  const storageKey = `schemesathi_docs_${scheme.id}`

  const [checkedDocs, setCheckedDocs] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(checkedDocs))
    } catch {}
  }, [checkedDocs, storageKey])

  const docs = scheme.requiredDocuments.length > 0
    ? scheme.requiredDocuments
    : [
        { name: 'Aadhaar Card (Identity & Address proof)', nameTe: 'ఆధార్ కార్డు (గుర్తింపు మరియు చిరునామా పత్రం)', isMandatory: true, issuingAuthority: 'UIDAI', sourceUrl: scheme.officialSourceUrl, verifiedAt: scheme.lastVerified },
        { name: 'Income Certificate (issued by Revenue Authority)', nameTe: 'ఆదాయ ధృవీకరణ పత్రం', isMandatory: false, issuingAuthority: 'Tahsildar / Meeseva', sourceUrl: scheme.officialSourceUrl, verifiedAt: scheme.lastVerified },
        { name: 'Active Bank Passbook (NPCI / Aadhaar seeded)', nameTe: 'ఆధార్ లింక్ అయిన బ్యాంక్ పాస్ పుస్తకం', isMandatory: true, issuingAuthority: 'Commercial Bank', sourceUrl: scheme.officialSourceUrl, verifiedAt: scheme.lastVerified },
        { name: 'Passport size Photographs', nameTe: 'పాస్‌పోర్ట్ సైజ్ ఫోటోలు', isMandatory: false, issuingAuthority: 'Self', sourceUrl: scheme.officialSourceUrl, verifiedAt: scheme.lastVerified }
      ]

  const total = docs.length
  const completed = docs.filter(d => checkedDocs.includes(d.name)).length
  const remaining = total - completed
  const percentage = Math.round((completed / total) * 100)

  const toggleDoc = (name: string) => {
    setCheckedDocs(prev => prev.includes(name) ? prev.filter(d => d !== name) : [...prev, name])
  }

  const markAll = () => {
    setCheckedDocs(docs.map(d => d.name))
  }

  const clearAll = () => {
    setCheckedDocs([])
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="scheme-modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <section className="scheme-modal checklist-modal" role="dialog" aria-modal="true" aria-labelledby="checklist-modal-title">
        <div className="scheme-modal-header">
          <div>
            <div className="modal-kicker-row">
              <span className="section-kicker"><CheckSquare size={13} /> {lang === 'te' ? 'ఇంటరాక్టివ్ పత్రాల చెక్‌లిస్ట్' : 'INTERACTIVE DOCUMENT CHECKLIST'}</span>
              <span className="scheme-badge-pill">{scheme.governmentLevel}</span>
            </div>
            <h2 id="checklist-modal-title">{lang === 'te' && scheme.nameTe ? scheme.nameTe : scheme.name}</h2>
            <p className="scheme-dept-line">{lang === 'te' && scheme.departmentTe ? scheme.departmentTe : scheme.department}</p>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        <div className="scheme-modal-content">
          {/* Progress Tracker Card */}
          <div className="checklist-progress-card">
            <div className="progress-card-top">
              <div>
                <span className="progress-kicker">{lang === 'te' ? 'సిద్ధత స్థితి' : 'PREPARATION STATUS'}</span>
                <h4>
                  {completed} of {total} {lang === 'te' ? 'పత్రాలు సిద్ధంగా ఉన్నాయి' : 'documents ready'}
                </h4>
              </div>
              <span className={`progress-percentage ${percentage === 100 ? 'complete' : ''}`}>
                {percentage}%
              </span>
            </div>

            <div className="progress-bar-bg" role="progressbar" aria-valuenow={percentage} aria-valuemin={0} aria-valuemax={100}>
              <div className="progress-bar-fill" style={{ width: `${percentage}%` }} />
            </div>

            <div className="progress-card-actions">
              <span className="remaining-label">
                {remaining > 0 ? (
                  <><strong>{remaining}</strong> {lang === 'te' ? 'పత్రాలు ఇంకా అవసరం' : 'remaining documents needed'}</>
                ) : (
                  <span className="all-ready-tag"><Check size={14} /> {lang === 'te' ? 'అన్ని పత్రాలు సిద్ధంగా ఉన్నాయి!' : 'All documents are ready to apply!'}</span>
                )}
              </span>
              <div className="bulk-actions">
                <button type="button" className="link-button" onClick={markAll}>
                  {lang === 'te' ? 'అన్నీ ఎంచుకోండి' : 'Mark all'}
                </button>
                <span>·</span>
                <button type="button" className="link-button" onClick={clearAll}>
                  {lang === 'te' ? 'రీసెట్' : 'Reset'}
                </button>
              </div>
            </div>
          </div>

          {/* Interactive Checklist */}
          <div className="docs-interactive-section">
            <h4 className="docs-section-title">
              <FileCheck2 size={16} /> {lang === 'te' ? 'అధికారిక పత్రాల జాబితా' : 'Required Documents for Application'}
            </h4>
            <p className="docs-section-sub">
              {lang === 'te'
                ? 'మీరు ఇప్పటికే కలిగి ఉన్న పత్రాలను టిక్ చేయండి. మిగిలిన వాటిని సంబంధిత అధికారుల నుండి పొందండి.'
                : 'Tick the documents you have already arranged. Arrange the remaining ones before submitting your application.'}
            </p>

            <div className="checklist-items-grid">
              {docs.map((doc) => {
                const isChecked = checkedDocs.includes(doc.name)
                const docName = lang === 'te' && doc.nameTe ? doc.nameTe : doc.name

                return (
                  <label key={doc.name} className={`checklist-item-row ${isChecked ? 'is-completed' : ''}`}>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleDoc(doc.name)}
                      className="checklist-checkbox"
                    />
                    <div className="checklist-item-content">
                      <div className="doc-name-row">
                        <span className="doc-name">{docName}</span>
                        {doc.isMandatory ? (
                          <span className="mandatory-pill">{lang === 'te' ? 'తప్పనిసరి' : 'Mandatory'}</span>
                        ) : (
                          <span className="optional-pill">{lang === 'te' ? 'ఐచ్ఛికం' : 'Optional'}</span>
                        )}
                      </div>
                      {doc.issuingAuthority && (
                        <p className="doc-authority">
                          {lang === 'te' ? 'జారీ చేసే అధికారి:' : 'Issuing authority:'} <strong>{doc.issuingAuthority}</strong>
                        </p>
                      )}
                    </div>
                  </label>
                )
              })}
            </div>
          </div>

          {/* Official Guidance Tip */}
          <div className="checklist-guidance-box">
            <Info size={16} />
            <div>
              <strong>{lang === 'te' ? 'దరఖాస్తు సూచన' : 'Official Application Tip'}</strong>
              <p>
                {lang === 'te'
                  ? 'మీ అన్ని పత్రాలపై మీ పేరు, పుట్టిన తేదీ మరియు ఆధార్ వివరాలు ఒకే విధంగా ఉండేలా చూసుకోండి. ఆంధ్రప్రదేశ్‌లో కుల మరియు ఆదాయ ధృవీకరణలను గ్రామ/వార్డు సచివాలయం లేదా మీసేవ ద్వారా సులభంగా పొందవచ్చు.'
                  : 'Ensure applicant name and date of birth match across Aadhaar, bank passbook, and certificates. In Andhra Pradesh, income and caste certificates can be obtained through Grama/Ward Sachivalayam or Meeseva.'}
              </p>
            </div>
          </div>

          {/* Actions Footer */}
          <div className="checklist-footer-actions">
            <button type="button" className="btn-secondary" onClick={handlePrint}>
              <Printer size={15} /> {lang === 'te' ? 'చెక్‌లిస్ట్ ప్రింట్ చేయండి' : 'Print Checklist'}
            </button>
            <a
              href={scheme.officialUrl}
              target="_blank"
              rel="noreferrer"
              className="btn-primary"
            >
              {lang === 'te' ? 'అధికారిక పోర్టల్‌లో దరఖాస్తు చేయండి' : 'Apply on Official Portal'} <ExternalLink size={14} />
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
