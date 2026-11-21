import { useState, type FormEvent } from 'react'
import { Filter, ArrowRight, ShieldCheck, MapPin, ChevronDown, RotateCcw } from 'lucide-react'
import type { Language } from '../data/translations'
import { translations } from '../data/translations'

const stateOptions = [
  'All India',
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Puducherry'
]

const apDistricts = [
  'Alluri Sitharama Raju',
  'Anakapalli',
  'Ananthapuramu',
  'Annamayya',
  'Bapatla',
  'Chittoor',
  'Dr. B.R. Ambedkar Konaseema',
  'East Godavari',
  'Eluru',
  'Guntur',
  'Kakinada',
  'Krishna',
  'Kurnool',
  'Nandyal',
  'NTR (Vijayawada)',
  'Palnadu',
  'Parvathipuram Manyam',
  'Prakasam',
  'Srikakulam',
  'Sri Potti Sriramulu Nellore',
  'Sri Sathya Sai',
  'Tirupati',
  'Visakhapatnam',
  'Vizianagaram',
  'West Godavari',
  'YSR Kadapa'
]

const incomeOptions = [
  'Any income',
  'Under ₹1 lakh',
  '₹1–3 lakh',
  '₹3–5 lakh',
  'Above ₹5 lakh'
]

const occupationOptions = [
  'Any occupation',
  'Farmer',
  'Artisan',
  'Daily wage worker',
  'Driver / Auto Owner',
  'Weaver / Handloom',
  'Self-employed',
  'Student',
  'Homemaker',
  'Other'
]

const statusOptions = [
  'Choose current status',
  'School student',
  'College student',
  'Recent graduate',
  'Looking for work',
  'Currently employed',
  'Returning to work'
]

const qualificationOptions = [
  'Choose highest qualification',
  'Below Class 10',
  'Class 10',
  'Class 12',
  'ITI / trade certificate',
  'Diploma',
  'Undergraduate',
  'Graduate',
  'Postgraduate'
]

export type FormProfileData = {
  age: string
  income: string
  occupation: string
  state: string
  district: string
  residence: string
  gender: string
  maritalStatus: string
  qualification: string
  currentStatus: string
  familySize: string
  bplStatus: string
  socialCategory: string
  disabilityStatus: string
  farmerStatus: string
  housingStatus: string
}

type Props = {
  lang: Language
  profileData: FormProfileData
  onChange: (key: keyof FormProfileData, value: string) => void
  onSubmit: (e: FormEvent<HTMLFormElement>) => void
  onReset: () => void
}

export function EligibilityForm({ lang, profileData, onChange, onSubmit, onReset }: Props) {
  const t = translations[lang]
  const [activeTab, setActiveTab] = useState<'personal' | 'education' | 'economic' | 'social'>('personal')

  const isAP = profileData.state === 'Andhra Pradesh'

  return (
    <section className="finder-panel" id="eligibility-checker" aria-labelledby="finder-title">
      <div className="finder-heading">
        <div className="finder-icon"><Filter size={20} /></div>
        <div>
          <p className="section-kicker">{lang === 'te' ? 'వ్యక్తిగత అర్హత తనిఖీ' : 'PERSONALISE YOUR SEARCH'}</p>
          <h2 id="finder-title">{t.finderTitle}</h2>
        </div>
        <p className="finder-note">
          {lang === 'te'
            ? 'మీ వివరాలు నమోదు చేసి ప్రభుత్వ సంక్షేమ పథకాలను కనుగొనండి.'
            : 'Tell us about your household to discover matching welfare schemes.'}
        </p>
      </div>

      {/* Trust & Privacy Notice */}
      <div className="privacy-guarantee-bar">
        <ShieldCheck size={16} />
        <span>{t.privacyNotice}</span>
      </div>

      {/* 4-Step Navigation Tabs */}
      <div className="form-section-tabs" role="tablist">
        <button
          type="button"
          className={`form-tab-btn ${activeTab === 'personal' ? 'active' : ''}`}
          onClick={() => setActiveTab('personal')}
        >
          {t.personalTab}
        </button>
        <button
          type="button"
          className={`form-tab-btn ${activeTab === 'education' ? 'active' : ''}`}
          onClick={() => setActiveTab('education')}
        >
          {t.educationTab}
        </button>
        <button
          type="button"
          className={`form-tab-btn ${activeTab === 'economic' ? 'active' : ''}`}
          onClick={() => setActiveTab('economic')}
        >
          {t.economicTab}
        </button>
        <button
          type="button"
          className={`form-tab-btn ${activeTab === 'social' ? 'active' : ''}`}
          onClick={() => setActiveTab('social')}
        >
          {t.socialTab}
        </button>
      </div>

      <form onSubmit={onSubmit} className="profile-form-container">
        {/* TAB 1: PERSONAL INFORMATION */}
        {activeTab === 'personal' && (
          <div className="tab-pane-content">
            <div className="form-grid-3">
              <label className="field">
                <span>{t.age} *</span>
                <div className="input-wrap">
                  <input
                    type="number"
                    min="0"
                    max="120"
                    required
                    placeholder={t.agePlaceholder}
                    value={profileData.age}
                    onChange={(e) => onChange('age', e.target.value)}
                  />
                  <span>{lang === 'te' ? 'సంవత్సరాలు' : 'years'}</span>
                </div>
              </label>

              <label className="field">
                <span>{t.state} *</span>
                <div className="select-wrap state-select">
                  <MapPin size={15} />
                  <select value={profileData.state} onChange={(e) => onChange('state', e.target.value)}>
                    {stateOptions.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} />
                </div>
              </label>

              <label className="field">
                <span>{t.district} {isAP ? '(AP Districts)' : ''}</span>
                {isAP ? (
                  <div className="select-wrap">
                    <select value={profileData.district} onChange={(e) => onChange('district', e.target.value)}>
                      <option value="">{lang === 'te' ? 'జిల్లాను ఎంచుకోండి' : 'Select District'}</option>
                      {apDistricts.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                    <ChevronDown size={16} />
                  </div>
                ) : (
                  <div className="input-wrap">
                    <input
                      placeholder={t.districtPlaceholder}
                      value={profileData.district}
                      onChange={(e) => onChange('district', e.target.value)}
                    />
                  </div>
                )}
              </label>

              <label className="field">
                <span>{t.gender} <small className="optional-tag">Optional</small></span>
                <div className="select-wrap">
                  <select value={profileData.gender} onChange={(e) => onChange('gender', e.target.value)}>
                    <option value="">{t.genderAny}</option>
                    <option value="Woman">{t.genderWoman}</option>
                    <option value="Man">{t.genderMan}</option>
                    <option value="Another identity">{t.genderOther}</option>
                  </select>
                  <ChevronDown size={16} />
                </div>
              </label>

              <label className="field">
                <span>{t.residence} <small className="optional-tag">Optional</small></span>
                <div className="select-wrap">
                  <select value={profileData.residence} onChange={(e) => onChange('residence', e.target.value)}>
                    <option value="">{t.residenceAny}</option>
                    <option value="Rural">{t.residenceRural}</option>
                    <option value="Urban">{t.residenceUrban}</option>
                  </select>
                  <ChevronDown size={16} />
                </div>
              </label>

              <label className="field">
                <span>{t.maritalStatus} <small className="optional-tag">Optional</small></span>
                <div className="select-wrap">
                  <select value={profileData.maritalStatus} onChange={(e) => onChange('maritalStatus', e.target.value)}>
                    <option value="">{t.maritalAny}</option>
                    <option value="Single">{t.maritalSingle}</option>
                    <option value="Married">{t.maritalMarried}</option>
                    <option value="Widowed">{t.maritalWidowed}</option>
                    <option value="Divorced">{t.maritalDivorced}</option>
                  </select>
                  <ChevronDown size={16} />
                </div>
              </label>
            </div>

            <div className="tab-nav-footer">
              <button type="button" className="btn-secondary" onClick={() => setActiveTab('education')}>
                {lang === 'te' ? 'తర్వాత: విద్య & ఉపాధి' : 'Next: Education & Work'} →
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: EDUCATIONAL & EMPLOYMENT INFORMATION */}
        {activeTab === 'education' && (
          <div className="tab-pane-content">
            <div className="form-grid-3">
              <label className="field">
                <span>{t.educationLevel}</span>
                <div className="select-wrap">
                  <select value={profileData.qualification} onChange={(e) => onChange('qualification', e.target.value)}>
                    <option value="">{t.educationAny}</option>
                    {qualificationOptions.slice(1).map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} />
                </div>
              </label>

              <label className="field">
                <span>{t.currentlyStudying}</span>
                <div className="select-wrap">
                  <select
                    value={profileData.currentStatus}
                    onChange={(e) => onChange('currentStatus', e.target.value)}
                  >
                    <option value="">{lang === 'te' ? 'ఎంచుకోండి' : 'Choose status'}</option>
                    {statusOptions.slice(1).map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} />
                </div>
              </label>

              <label className="field">
                <span>{t.occupation}</span>
                <div className="select-wrap">
                  <select value={profileData.occupation} onChange={(e) => onChange('occupation', e.target.value)}>
                    {occupationOptions.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} />
                </div>
              </label>
            </div>

            <div className="tab-nav-footer">
              <button type="button" className="btn-secondary" onClick={() => setActiveTab('personal')}>
                ← {lang === 'te' ? 'వెనుకకు' : 'Back'}
              </button>
              <button type="button" className="btn-secondary" onClick={() => setActiveTab('economic')}>
                {lang === 'te' ? 'తర్వాత: ఆదాయం & కుటుంబం' : 'Next: Income & Household'} →
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: ECONOMIC & HOUSEHOLD */}
        {activeTab === 'economic' && (
          <div className="tab-pane-content">
            <div className="form-grid-3">
              <label className="field">
                <span>{t.annualIncome}</span>
                <div className="select-wrap">
                  <select value={profileData.income} onChange={(e) => onChange('income', e.target.value)}>
                    {incomeOptions.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} />
                </div>
              </label>

              <label className="field">
                <span>{t.bplStatus}</span>
                <div className="select-wrap">
                  <select value={profileData.bplStatus} onChange={(e) => onChange('bplStatus', e.target.value)}>
                    <option value="">{lang === 'te' ? 'ఎంచుకోండి' : 'Choose option'}</option>
                    <option value="Yes">{t.bplYes}</option>
                    <option value="No">{t.bplNo}</option>
                  </select>
                  <ChevronDown size={16} />
                </div>
              </label>

              <label className="field">
                <span>{t.familySize} <small className="optional-tag">Optional</small></span>
                <div className="input-wrap">
                  <input
                    type="number"
                    min="1"
                    max="25"
                    placeholder="e.g. 4"
                    value={profileData.familySize}
                    onChange={(e) => onChange('familySize', e.target.value)}
                  />
                  <span>members</span>
                </div>
              </label>
            </div>

            <div className="tab-nav-footer">
              <button type="button" className="btn-secondary" onClick={() => setActiveTab('education')}>
                ← {lang === 'te' ? 'వెనుకకు' : 'Back'}
              </button>
              <button type="button" className="btn-secondary" onClick={() => setActiveTab('social')}>
                {lang === 'te' ? 'తర్వాత: సామాజిక వర్గం' : 'Next: Category & Details'} →
              </button>
            </div>
          </div>
        )}

        {/* TAB 4: SOCIAL & SPECIAL CATEGORIES */}
        {activeTab === 'social' && (
          <div className="tab-pane-content">
            <div className="form-grid-4">
              <label className="field">
                <span>{t.socialCategory}</span>
                <div className="select-wrap">
                  <select value={profileData.socialCategory} onChange={(e) => onChange('socialCategory', e.target.value)}>
                    <option value="">{t.socialCategoryAny}</option>
                    <option value="SC">SC (Scheduled Caste)</option>
                    <option value="ST">ST (Scheduled Tribe)</option>
                    <option value="OBC">OBC (Backward Class)</option>
                    <option value="General">General / OC</option>
                    <option value="EWS">EWS</option>
                  </select>
                  <ChevronDown size={16} />
                </div>
              </label>

              <label className="field">
                <span>{t.farmerStatus}</span>
                <div className="select-wrap">
                  <select value={profileData.farmerStatus} onChange={(e) => onChange('farmerStatus', e.target.value)}>
                    <option value="">{lang === 'te' ? 'ఎంచుకోండి' : 'Prefer not to say'}</option>
                    <option value="Yes">{lang === 'te' ? 'అవును (రైతు / సాగుదారుడు)' : 'Yes (Farmer / Cultivator)'}</option>
                    <option value="No">{lang === 'te' ? 'కాదు' : 'No'}</option>
                  </select>
                  <ChevronDown size={16} />
                </div>
              </label>

              <label className="field">
                <span>{t.disabilityStatus}</span>
                <div className="select-wrap">
                  <select value={profileData.disabilityStatus} onChange={(e) => onChange('disabilityStatus', e.target.value)}>
                    <option value="">{lang === 'te' ? 'ఎంచుకోండి' : 'Prefer not to say'}</option>
                    <option value="Yes">{lang === 'te' ? 'అవును (దివ్యాంగులు)' : 'Yes (PwD)'}</option>
                    <option value="No">{lang === 'te' ? 'కాదు' : 'No'}</option>
                  </select>
                  <ChevronDown size={16} />
                </div>
              </label>

              <label className="field">
                <span>{t.housingStatus}</span>
                <div className="select-wrap">
                  <select value={profileData.housingStatus} onChange={(e) => onChange('housingStatus', e.target.value)}>
                    <option value="">{t.housingAny}</option>
                    <option value="Own permanent (Pucca) house">{t.housingOwnPucca}</option>
                    <option value="Kutcha / Temporary house">{t.housingKutcha}</option>
                    <option value="Homeless / No permanent house">{t.housingHomeless}</option>
                    <option value="Living in rented house">{t.housingRented}</option>
                  </select>
                  <ChevronDown size={16} />
                </div>
              </label>
            </div>

            <div className="tab-nav-footer">
              <button type="button" className="btn-secondary" onClick={() => setActiveTab('economic')}>
                ← {lang === 'te' ? 'వెనుకకు' : 'Back'}
              </button>
            </div>
          </div>
        )}

        {/* Form Action Controls */}
        <div className="form-submit-row">
          <button type="button" className="btn-reset" onClick={onReset} title="Reset Form">
            <RotateCcw size={15} /> {t.resetFormBtn}
          </button>

          <button type="submit" className="find-button-primary">
            {t.checkProfileBtn} <ArrowRight size={17} />
          </button>
        </div>
      </form>
    </section>
  )
}
