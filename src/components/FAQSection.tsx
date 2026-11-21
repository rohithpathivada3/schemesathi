import { useState } from 'react'
import { ChevronDown, HelpCircle } from 'lucide-react'
import type { Language } from '../data/translations'

type Props = {
  lang: Language
}

export function FAQSection({ lang }: Props) {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  const faqs = lang === 'te' ? [
    {
      q: 'స్కీమ్‌సాథి అంటే ఏమిటి? ఇది అధికారిక ప్రభుత్వ వెబ్‌సైటా?',
      a: 'స్కీమ్‌సాథి అనేది భారతీయ పౌరులకు ప్రభుత్వ సంక్షేమ పథకాలను సులభంగా కనుగొనడానికి రూపొందించబడిన స్వతంత్ర స్మార్ట్ వేదిక. ఇది అధికారిక ప్రభుత్వ పోర్టల్ కాదు, కానీ myscheme.gov.in, india.gov.in, ap.gov.in వంటి అధికారిక వనరుల ఆధారంగా ఖచ్చితమైన సమాచారాన్ని అందిస్తుంది.'
    },
    {
      q: 'నేను నా ఆధార్ నంబర్ లేదా బ్యాంక్ ఖాతా వివరాలను ఇవ్వాలా?',
      a: 'ఖచ్చితంగా అవసరం లేదు! స్కీమ్‌సాథి మీ గోప్యతను కాపాడుతుంది. మేము ఆధార్ కార్డు నంబర్లు, బ్యాంక్ ఖాతా సంఖ్యలు, ఓటీపీలు లేదా పాస్‌వర్డ్‌లను ఎప్పటికీ అడగము మరియు సేకరించము. కేవలం మీ వయస్సు, ఆదాయ పరిమితి, వృత్తి వంటి ప్రాథమిక వివరాలు మాత్రమే సరిపోతాయి.'
    },
    {
      q: 'వర్గం A, B మరియు C ఫలితాల మధ్య తేడా ఏమిటి?',
      a: 'వర్గం A (అర్హత ఉంది): మీ వివరాల ప్రకారం అన్ని తప్పనిసరి నిబంధనలు సరిపోయాయి. వర్గం B (ధృవీకరణ అవసరం): కొన్ని వివరాలు నమోదు చేయలేదు లేదా అధికారిక పోర్టల్‌లో అదనపు తనిఖీ అవసరం. వర్గం C (అర్హత లేదు): వయస్సు లేదా ఆదాయ పరిమితి వంటి ఒకటి లేదా అంతకంటే ఎక్కువ నిబంధనలు సరిపోలడం లేదు.'
    },
    {
      q: 'ఆంధ్రప్రదేశ్ రాష్ట్ర పథకాలు ఇందులో ఉన్నాయా?',
      a: 'అవును! రైతు భరోసా, అమ్మ ఒడి (తల్లికి వందనం), విద్యా దీవెన, డాక్టర్ వైఎస్సార్ ఆరోగ్యశ్రీ, వైఎస్సార్ చేయూత, పెన్షన్ కానుక, వాహన మిత్ర వంటి ప్రముఖ ఆంధ్రప్రదేశ్ సంక్షేమ పథకాలు మరియు వాటి దరఖాస్తు విధానాలు వివరంగా ఉన్నాయి.'
    },
    {
      q: 'పథకానికి దరఖాస్తు చేసుకోవడం ఎలా?',
      a: 'ప్రతి పథకం కార్డులోని "పత్రాల చెక్‌లిస్ట్" ద్వారా అవసరమైన పత్రాలను సిద్ధం చేసుకుని, "అధికారిక పోర్టల్" బటన్ ద్వారా నేరుగా సంబంధిత ప్రభుత్వ వెబ్‌సైట్ లేదా గ్రామ/వార్డు సచివాలయంలో దరఖాస్తు చేసుకోవచ్చు.'
    }
  ] : [
    {
      q: 'What is SchemeSathi? Is it an official government website?',
      a: 'SchemeSathi is an independent discovery platform designed to help Indian citizens find welfare schemes they may qualify for. While it is an independent guide, all information is periodically checked against official government sources such as myscheme.gov.in, india.gov.in, and state portals.'
    },
    {
      q: 'Do I need to enter my Aadhaar number or bank account details?',
      a: 'No, absolutely never! SchemeSathi does not request, store, or require Aadhaar numbers, bank account details, or sensitive passwords. We only evaluate demographic parameters like age, state, occupation, and approximate income band.'
    },
    {
      q: 'What is the difference between Category A, B, and C results?',
      a: 'Category A (Appears Eligible): All verified mandatory criteria match your profile. Category B (Needs Verification): Missing profile details or guidelines requiring source check. Category C (Not Eligible): One or more mandatory conditions (e.g. age range or income ceiling) are not met.'
    },
    {
      q: 'Does SchemeSathi include Andhra Pradesh state schemes?',
      a: 'Yes! SchemeSathi provides detailed coverage of Andhra Pradesh schemes including AP Rythu Bharosa, Jagananna Amma Vodi, Vidya Deevena, Dr. YSR Aarogyasri, YSR Cheyutha, Pension Kanuka, and Vahana Mitra with Telugu language support.'
    },
    {
      q: 'How do I actually submit an application for an eligible scheme?',
      a: 'Use our Interactive Document Checklist to track required certificates. When ready, click "Official Portal" on the scheme card to apply directly on the government website or visit your local Grama/Ward Sachivalayam or CSC.'
    }
  ]

  return (
    <section className="faq-section" id="faq">
      <div className="section-title-row">
        <div>
          <p className="section-kicker"><HelpCircle size={14} /> {lang === 'te' ? 'తరచుగా అడిగే ప్రశ్నలు' : 'FREQUENTLY ASKED QUESTIONS'}</p>
          <h2>{lang === 'te' ? 'మీ సందేహాలు & సమాధానాలు' : 'Questions & Clear Answers'}</h2>
          <p className="results-subtitle">{lang === 'te' ? 'పథకాల అన్వేషణ మరియు దరఖాస్తు విధానంపై ముఖ్యమైన సమాచారం' : 'Everything you need to know about finding and applying for public welfare schemes.'}</p>
        </div>
      </div>

      <div className="faq-accordion">
        {faqs.map((faq, idx) => {
          const isOpen = openIndex === idx
          return (
            <div key={idx} className={`faq-card ${isOpen ? 'is-open' : ''}`}>
              <button
                type="button"
                className="faq-question-btn"
                onClick={() => setOpenIndex(isOpen ? null : idx)}
                aria-expanded={isOpen}
              >
                <span>{faq.q}</span>
                <ChevronDown size={18} className={`chevron-icon ${isOpen ? 'rotate' : ''}`} />
              </button>
              {isOpen && (
                <div className="faq-answer-content">
                  <p>{faq.a}</p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
