import { Users, Filter, CheckSquare, ExternalLink, Sparkles } from 'lucide-react'
import type { Language } from '../data/translations'
import { translations } from '../data/translations'

type Props = {
  lang: Language
}

export function HowItWorks({ lang }: Props) {
  const t = translations[lang]

  const steps = [
    {
      num: '01',
      icon: Users,
      title: t.step1Title,
      desc: t.step1Desc
    },
    {
      num: '02',
      icon: Filter,
      title: t.step2Title,
      desc: t.step2Desc
    },
    {
      num: '03',
      icon: CheckSquare,
      title: t.step3Title,
      desc: t.step3Desc
    },
    {
      num: '04',
      icon: ExternalLink,
      title: t.step4Title,
      desc: t.step4Desc
    }
  ]

  return (
    <section className="how-section" id="how-it-works">
      <div className="how-intro">
        <span className="how-icon"><Sparkles size={18} /></span>
        <p className="section-kicker">{lang === 'te' ? 'సరళమైన 4 దశల్లో' : 'SIMPLE 4-STEP PROCESS'}</p>
        <h2>{t.howItWorksTitle}</h2>
        <p>{t.howItWorksSubtitle}</p>
        <a href="#discover" className="btn-browse-link">
          {t.exploreSchemesBtn} →
        </a>
      </div>

      <div className="steps-list">
        {steps.map((st, i) => {
          const Icon = st.icon
          return (
            <div className="step" key={i}>
              <span className="step-number">{st.num}</span>
              <div className="step-content">
                <h3>{st.title}</h3>
                <p>{st.desc}</p>
              </div>
              <span className="step-icon-wrap"><Icon size={20} /></span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
