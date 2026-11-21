import { ShieldCheck, Award, Smartphone, CheckCircle, Languages, FileCheck } from 'lucide-react'
import type { Language } from '../data/translations'

type Props = {
  lang: Language
}

export function WhyChooseSection({ lang }: Props) {
  const features = lang === 'te' ? [
    {
      icon: ShieldCheck,
      title: 'గోప్యతకు అత్యున్నత ప్రాధాన్యత',
      desc: 'ఆధార్ నంబర్, బ్యాంక్ ఖాతా వివరాలు లేదా పాస్‌వర్డ్‌లు అస్సలు అవసరం లేదు. మీ సమాచారం సురక్షితంగా ఉంటుంది.'
    },
    {
      icon: Award,
      title: 'నిబంధనల ఆధారిత ఖచ్చితమైన విశ్లేషణ',
      desc: 'కేవలం కేటగిరీ ద్వారా కాకుండా, వయస్సు, ఆదాయం, సామాజిక వర్గం వంటి అధికారిక నిబంధనలతో పోల్చి చూపుతుంది.'
    },
    {
      icon: Languages,
      title: 'ద్విభాషా సహకారం (English & తెలుగు)',
      desc: 'ఆంధ్రప్రదేశ్ ప్రజల సౌలభ్యం కొరకు సరళమైన తెలుగు మరియు ఆంగ్ల భాషలలో పూర్తి సమాచారం అందుబాటులో ఉంది.'
    },
    {
      icon: FileCheck,
      title: 'ఇంటరాక్టివ్ పత్రాల చెక్‌లిస్ట్',
      desc: 'దరఖాస్తుకు ఏ పత్రాలు అవసరమో టిక్ చేసుకుని, ఇంకా ఏవి సేకరించాలో తేలికగా తెలుసుకోవచ్చు.'
    },
    {
      icon: Smartphone,
      title: 'మొబైల్ & డెస్క్‌టాప్ అనుకూలత',
      desc: 'గ్రామీణ మరియు పట్టణ ప్రజలందరికీ సులభంగా అర్థమయ్యే రీతిలో ప్రతి పరికరంలోనూ వేగంగా పనిచేస్తుంది.'
    },
    {
      icon: CheckCircle,
      title: 'అధికారిక ప్రభుత్వ పోర్టల్ లింకులు',
      desc: 'నకిలీ లింకులు లేకుండా నేరుగా కేంద్ర మరియు రాష్ట్ర ప్రభుత్వ అధికారిక వెబ్‌సైట్లకు మార్గనిర్దేశం చేస్తుంది.'
    }
  ] : [
    {
      icon: ShieldCheck,
      title: 'Zero Sensitive Data Collection',
      desc: 'We never ask for Aadhaar numbers, bank account numbers, or OTPs. All profile evaluations remain safe in your session.'
    },
    {
      icon: Award,
      title: 'Rule-Based Eligibility Engine',
      desc: 'We match age, income ceilings, occupation, and state requirements against official criteria, not vague keyword matching.'
    },
    {
      icon: Languages,
      title: 'Bilingual Support (English & Telugu)',
      desc: 'Full bilingual interface optimized for citizens across India, with dedicated Andhra Pradesh state welfare schemes.'
    },
    {
      icon: FileCheck,
      title: 'Interactive Document Checklist',
      desc: 'Track ready documents with checkboxes and see remaining required certificates before heading to apply.'
    },
    {
      icon: Smartphone,
      title: 'Accessible & Responsive Design',
      desc: 'Built with high-contrast, clean typography and accessible touch targets for citizens with limited digital exposure.'
    },
    {
      icon: CheckCircle,
      title: 'Verified Government Portals',
      desc: 'Direct links to official application portals (myscheme.gov.in, india.gov.in, ap.gov.in) with zero intermediaries.'
    }
  ]

  return (
    <section className="why-choose-section">
      <div className="section-title-row">
        <div>
          <p className="section-kicker">{lang === 'te' ? 'స్కీమ్‌సాథి ఎందుకు?' : 'WHY CHOOSE SCHEMESATHI?'}</p>
          <h2>{lang === 'te' ? 'పౌరుల సంక్షేమం కోసం విశ్వసనీయ వేదిక' : 'Empowering Citizens with Public Benefits'}</h2>
          <p className="results-subtitle">
            {lang === 'te' ? 'సరళమైన, పారదర్శకమైన మరియు సురక్షితమైన ప్రభుత్వ పథకాల మార్గదర్శి.' : 'Simple, transparent, and completely free discovery of government welfare opportunities.'}
          </p>
        </div>
      </div>

      <div className="features-grid">
        {features.map((f, i) => {
          const Icon = f.icon
          return (
            <div className="feature-card" key={i}>
              <div className="feature-icon"><Icon size={20} /></div>
              <h4>{f.title}</h4>
              <p>{f.desc}</p>
            </div>
          )
        })}
      </div>
    </section>
  )
}
