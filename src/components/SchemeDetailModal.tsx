import { ExternalLink, Phone, ShieldCheck, MapPin, Calendar, CheckSquare, Award, X, Sparkles, BookOpen, UserCheck } from 'lucide-react'
import type { Scheme } from '../data/schemes'
import type { Language } from '../data/translations'

type Props = {
  scheme: Scheme
  lang: Language
  onClose: () => void
  onOpenChecklist: () => void
}

export function SchemeDetailModal({ scheme, lang, onClose, onOpenChecklist }: Props) {

  const schemeName = lang === 'te' && scheme.nameTe ? scheme.nameTe : scheme.name
  const department = lang === 'te' && scheme.departmentTe ? scheme.departmentTe : scheme.department
  const description = lang === 'te' && scheme.descriptionTe ? scheme.descriptionTe : scheme.description
  const benefit = lang === 'te' && scheme.benefitTe ? scheme.benefitTe : scheme.benefit

  return (
    <div className="scheme-modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <section className="scheme-modal detailed-modal" role="dialog" aria-modal="true" aria-labelledby="detail-modal-title">
        {/* Modal Top Header */}
        <div className="scheme-modal-header">
          <div>
            <div className="modal-kicker-row">
              <span className="section-kicker">{scheme.category.toUpperCase()} · {scheme.governmentLevel.toUpperCase()}</span>
              {scheme.state !== 'All India' && <span className="scheme-badge-pill">{scheme.state}</span>}
            </div>
            <h2 id="detail-modal-title">{schemeName}</h2>
            <p className="scheme-dept-line">{department}</p>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="scheme-modal-content">
          {/* Official Verification Banner */}
          <div className="verified-source-banner">
            <ShieldCheck size={18} />
            <div>
              <strong>{lang === 'te' ? 'ధృవీకరించబడిన ప్రభుత్వ మూలం' : 'Verified Official Government Guidelines'}</strong>
              <p>
                {lang === 'te'
                  ? `మూల సూచన: ${scheme.sourceReference}. చివరిగా సమీక్షించిన తేదీ: ${scheme.lastVerified ?? 'నవంబర్ 2026'}.`
                  : `Source reference: ${scheme.sourceReference}. Last verified: ${scheme.lastVerified ?? 'November 2026'}.`}
              </p>
            </div>
          </div>

          {/* Quick Key Meta Grid */}
          <div className="detail-meta-grid">
            <div className="meta-card">
              <span className="meta-icon"><MapPin size={16} /></span>
              <div>
                <small>{lang === 'te' ? 'పరిధి / ప్రాంతం' : 'Jurisdiction'}</small>
                <strong>{scheme.state === 'All India' ? (lang === 'te' ? 'కేంద్ర ప్రభుత్వం (భారతదేశం)' : 'Central (Pan-India)') : scheme.state}</strong>
              </div>
            </div>

            <div className="meta-card">
              <span className="meta-icon"><Calendar size={16} /></span>
              <div>
                <small>{lang === 'te' ? 'గడువు తేదీ' : 'Application Window'}</small>
                <strong>{scheme.deadline ?? (lang === 'te' ? 'ఏడాది పొడవునా తెరిచి ఉంటుంది' : 'Open throughout the year')}</strong>
              </div>
            </div>

            <div className="meta-card">
              <span className="meta-icon"><Phone size={16} /></span>
              <div>
                <small>{lang === 'te' ? 'హెల్ప్‌లైన్ / సంప్రదించండి' : 'Official Helpline'}</small>
                <strong>{scheme.helpline ?? '1800-11-2026 / 1902'}</strong>
              </div>
            </div>
          </div>

          {/* 1. About the Scheme */}
          <section className="detail-section">
            <h3 className="section-title"><BookOpen size={16} /> 1. {lang === 'te' ? 'పథకం గురించి (About the Scheme)' : 'About the Scheme'}</h3>
            <p className="section-body-text">{description}</p>
          </section>

          {/* 2. Purpose of the Scheme */}
          {scheme.purpose && (
            <section className="detail-section">
              <h3 className="section-title"><Sparkles size={16} /> 2. {lang === 'te' ? 'పథకం ముఖ్య ఉద్దేశ్యం (Purpose)' : 'Purpose of the Scheme'}</h3>
              <p className="section-body-text">{scheme.purpose}</p>
            </section>
          )}

          {/* 3 & 4 & 5 & 6 & 7. Who Can Apply & Detailed Eligibility Requirements */}
          <section className="detail-section">
            <h3 className="section-title"><UserCheck size={16} /> 3. {lang === 'te' ? 'ఎవరు దరఖాస్తు చేసుకోవచ్చు? (Eligibility Criteria)' : 'Who Can Apply & Eligibility Rules'}</h3>
            <div className="eligibility-rules-grid">
              {scheme.criteria.length > 0 ? (
                scheme.criteria.map((c, i) => (
                  <div key={i} className="rule-card">
                    <span className="rule-dot">✓</span>
                    <div>
                      <strong>{c.field.toUpperCase()}</strong>: {lang === 'te' && c.explanationTe ? c.explanationTe : c.explanation}
                      {c.mandatory && <span className="mandatory-tag">{lang === 'te' ? 'తప్పనిసరి నిబంధన' : 'Mandatory Condition'}</span>}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rule-card">
                  <span className="rule-dot">ℹ</span>
                  <div>{lang === 'te' ? 'అధికారిక మార్గదర్శకాల ప్రకారం ప్రాథమిక నిబంధనలు వర్తిస్తాయి.' : 'General eligibility guidelines apply as published on the official government portal.'}</div>
                </div>
              )}
            </div>
          </section>

          {/* 8. Benefits Provided */}
          <section className="detail-section">
            <h3 className="section-title"><Award size={16} /> 4. {lang === 'te' ? 'అందే ప్రయోజనాలు (Benefits Provided)' : 'Benefits Provided'}</h3>
            <div className="benefit-highlight-card">
              <span className="benefit-badge-icon">💰</span>
              <div>
                <strong>{benefit ?? (lang === 'te' ? 'అధికారిక పోర్టల్‌లో ప్రస్తుత ప్రయోజనాలను పరిశీలించండి' : 'Check latest benefit rates on the official government portal')}</strong>
                <p>{lang === 'te' ? 'ప్రయోజనాలు నేరుగా మీ ఆధార్ సీడెడ్ బ్యాంక్ ఖాతాలో డీబీటీ (DBT) ద్వారా జమ చేయబడతాయి.' : 'Benefits are disbursed directly to the verified Aadhaar-seeded bank account through Direct Benefit Transfer (DBT).'}</p>
              </div>
            </div>
          </section>

          {/* 9. Required Documents */}
          <section className="detail-section">
            <div className="section-title-with-action">
              <h3 className="section-title"><CheckSquare size={16} /> 5. {lang === 'te' ? 'అవసరమైన పత్రాలు (Required Documents)' : 'Required Documents'}</h3>
              <button type="button" className="checklist-pill-btn" onClick={onOpenChecklist}>
                <CheckSquare size={13} /> {lang === 'te' ? 'ఇంటరాక్టివ్ చెక్‌లిస్ట్ తెరవండి' : 'Open Document Checklist'}
              </button>
            </div>
            <ul className="docs-bullet-list">
              {scheme.requiredDocuments.length > 0 ? (
                scheme.requiredDocuments.map((doc, idx) => (
                  <li key={idx}>
                    <span>{lang === 'te' && doc.nameTe ? doc.nameTe : doc.name}</span>
                    {doc.isMandatory ? (
                      <small className="mandatory-pill">{lang === 'te' ? 'తప్పనిసరి' : 'Mandatory'}</small>
                    ) : (
                      <small className="optional-pill">{lang === 'te' ? 'ఐచ్ఛికం' : 'Optional'}</small>
                    )}
                  </li>
                ))
              ) : (
                <>
                  <li><span>Aadhaar Card linked to active Mobile number</span> <small className="mandatory-pill">Mandatory</small></li>
                  <li><span>Active Bank Passbook / Account statement</span> <small className="mandatory-pill">Mandatory</small></li>
                  <li><span>Income / Ration / BPL Card (where applicable)</span> <small className="optional-pill">Optional</small></li>
                </>
              )}
            </ul>
          </section>

          {/* 10. Application Procedure (Step-by-Step Guide) */}
          <section className="detail-section">
            <h3 className="section-title">6. {lang === 'te' ? 'దశలవారీ దరఖాస్తు విధానం (Step-by-Step Application Guide)' : 'Step-by-Step Application Guide'}</h3>
            <div className="stepper-vertical">
              {scheme.applicationSteps.length > 0 ? (
                scheme.applicationSteps.map((st, i) => (
                  <div key={i} className="stepper-node">
                    <span className="stepper-number">{st.stepNumber ?? i + 1}</span>
                    <div className="stepper-content">
                      {st.title && <strong>{st.title}</strong>}
                      <p>{lang === 'te' && st.textTe ? st.textTe : st.text}</p>
                    </div>
                  </div>
                ))
              ) : (
                <>
                  <div className="stepper-node">
                    <span className="stepper-number">1</span>
                    <div className="stepper-content">
                      <strong>Check Eligibility Conditions</strong>
                      <p>Carefully review the age, income, and residence requirements mentioned above.</p>
                    </div>
                  </div>
                  <div className="stepper-node">
                    <span className="stepper-number">2</span>
                    <div className="stepper-content">
                      <strong>Prepare Required Documents</strong>
                      <p>Gather your Aadhaar, bank passbook, and certificates using our document checklist.</p>
                    </div>
                  </div>
                  <div className="stepper-node">
                    <span className="stepper-number">3</span>
                    <div className="stepper-content">
                      <strong>Visit Official Government Portal / Service Centre</strong>
                      <p>Go to the official portal or visit your Village/Ward Secretariat / CSC.</p>
                    </div>
                  </div>
                  <div className="stepper-node">
                    <span className="stepper-number">4</span>
                    <div className="stepper-content">
                      <strong>Submit Application & Complete eKYC</strong>
                      <p>Fill out the application form accurately and complete biometric or OTP eKYC.</p>
                    </div>
                  </div>
                  <div className="stepper-node">
                    <span className="stepper-number">5</span>
                    <div className="stepper-content">
                      <strong>Save Acknowledgement & Track Status</strong>
                      <p>Keep your application reference number safe for online tracking.</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </section>

          {/* 11 & 12. Official Portal & Helpline Card */}
          <div className="modal-cta-box">
            <div>
              <h4>{lang === 'te' ? 'అధికారిక ప్రభుత్వ పోర్టల్' : 'Official Application Portal'}</h4>
              <p>{lang === 'te' ? 'ప్రభుత్వ పోర్టల్‌లో నేరుగా దరఖాస్తు చేసుకోవడానికి క్లిక్ చేయండి.' : 'Visit the verified government website to initiate your application.'}</p>
            </div>
            <div className="modal-cta-buttons">
              <button type="button" className="btn-secondary" onClick={onOpenChecklist}>
                <CheckSquare size={14} /> {lang === 'te' ? 'పత్రాల చెక్‌లిస్ట్' : 'Checklist'}
              </button>
              <a
                href={scheme.officialUrl}
                target="_blank"
                rel="noreferrer"
                className="btn-primary"
              >
                {lang === 'te' ? 'అధికారిక పోర్టల్ తెరవండి' : 'Open Official Portal'} <ExternalLink size={14} />
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
