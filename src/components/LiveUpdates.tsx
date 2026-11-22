import { useEffect, useState } from 'react'
import { ExternalLink, Sparkles } from 'lucide-react'
import type { Language } from '../data/translations'
import { discoveryDomains, type DiscoveryDomainId } from '../lib/domainMatching'
import { getLiveOpportunities, type LiveApplicationStatus, type LiveOpportunity } from '../lib/discovery'
import { DiscoveryNotificationOptIn } from './DiscoveryNotificationOptIn'

type Props = {
  selectedDomainIds: DiscoveryDomainId[]
  lang: Language
}

type LoadState = {
  key: string
  status: 'loading' | 'ready' | 'error'
  opportunities: LiveOpportunity[]
  error?: 'not-configured' | 'request-failed'
}

const statusLabels: Record<Language, Record<LiveApplicationStatus, string>> = {
  en: {
    new: 'New',
    active: 'Active',
    upcoming: 'Upcoming',
    closing_soon: 'Closing Soon',
    closed: 'Closed',
    verification_required: 'Verification Required',
  },
  te: {
    new: 'కొత్తది',
    active: 'ప్రస్తుతం అందుబాటులో ఉంది',
    upcoming: 'త్వరలో ప్రారంభం',
    closing_soon: 'గడువు సమీపిస్తోంది',
    closed: 'ముగిసింది',
    verification_required: 'ధృవీకరణ అవసరం',
  },
}

function opportunityCard(opportunity: LiveOpportunity, lang: Language) {
  const labels = discoveryDomains
    .filter((domain) => opportunity.domainIds.includes(domain.id))
    .map((domain) => domain.label[lang])
  const sourceLabel = lang === 'te' ? 'అధికారిక మూలం' : 'Official source'
  const notProvided = lang === 'te' ? 'అధికారిక మూలంలో ఇవ్వలేదు' : 'Not stated by source'

  return (
    <article className="live-opportunity-card" key={opportunity.id}>
      <div className="live-card-topline">
        <span className={`live-status-badge live-status-${opportunity.applicationStatus}`}>
          {statusLabels[lang][opportunity.applicationStatus]}
        </span>
        <span>{opportunity.sector === 'government'
          ? (lang === 'te' ? 'ప్రభుత్వం' : 'Government')
          : (lang === 'te' ? 'ప్రైవేట్' : 'Private')}</span>
      </div>
      <h3>{opportunity.title}</h3>
      <p className="live-organization">{opportunity.organizationName}</p>
      <div className="live-domain-tags">{labels.map((label) => <span key={label}>{label}</span>)}</div>
      <p className="live-description">{opportunity.description}</p>
      <dl className="live-facts">
        <div><dt>{lang === 'te' ? 'ప్రయోజనాలు' : 'Benefits'}</dt><dd>{opportunity.benefits.join('; ') || notProvided}</dd></div>
        <div><dt>{lang === 'te' ? 'అర్హత' : 'Eligibility'}</dt><dd>{opportunity.eligibility.join('; ') || notProvided}</dd></div>
        <div><dt>{lang === 'te' ? 'అవసరమైన పత్రాలు' : 'Required documents'}</dt><dd>{opportunity.requiredDocuments.join('; ') || notProvided}</dd></div>
        <div><dt>{lang === 'te' ? 'దరఖాస్తు ప్రారంభం' : 'Application starts'}</dt><dd>{opportunity.applicationStartDate ?? notProvided}</dd></div>
        <div><dt>{lang === 'te' ? 'దరఖాస్తు గడువు' : 'Application deadline'}</dt><dd>{opportunity.applicationDeadline ?? notProvided}</dd></div>
        <div><dt>{lang === 'te' ? 'ప్రచురణ తేదీ' : 'Published'}</dt><dd>{opportunity.sourcePublishedAt}</dd></div>
        <div><dt>{lang === 'te' ? 'చివరిగా ధృవీకరించినది' : 'Last verified'}</dt><dd>{opportunity.lastVerifiedAt.slice(0, 10)}</dd></div>
      </dl>
      <div className="live-card-actions">
        <a href={opportunity.sourceUrl} target="_blank" rel="noreferrer">
          {sourceLabel} <ExternalLink size={13} />
        </a>
        {opportunity.applicationUrl && (
          <a href={opportunity.applicationUrl} target="_blank" rel="noreferrer" className="live-apply-link">
            {lang === 'te' ? 'ఇప్పుడే దరఖాస్తు చేయండి' : 'Apply Now'} <ExternalLink size={13} />
          </a>
        )}
      </div>
    </article>
  )
}

export function LiveUpdates({ selectedDomainIds, lang }: Props) {
  const requestKey = selectedDomainIds.join(',')
  const [state, setState] = useState<LoadState>({
    key: '',
    status: 'loading',
    opportunities: [],
  })
  const visibleState = state.key === requestKey
    ? state
    : { key: requestKey, status: 'loading' as const, opportunities: [] }

  useEffect(() => {
    let active = true
    getLiveOpportunities(selectedDomainIds)
      .then((opportunities) => {
        if (active) setState({ key: requestKey, status: 'ready', opportunities })
      })
      .catch((error: unknown) => {
        if (!active) return
        const code = error instanceof Error && error.message === 'not-configured'
          ? 'not-configured'
          : 'request-failed'
        setState({ key: requestKey, status: 'error', opportunities: [], error: code })
      })
    return () => { active = false }
  }, [selectedDomainIds, requestKey])

  return (
    <section className="live-updates-section" id="live-updates" aria-labelledby="live-updates-title">
      <div className="live-section-heading">
        <div>
          <p className="section-kicker"><Sparkles size={14} /> {lang === 'te' ? 'ధృవీకరించిన ప్రత్యక్ష సమాచారం' : 'VERIFIED LIVE DISCOVERY'}</p>
          <h2 id="live-updates-title">{lang === 'te' ? 'తాజా అవకాశాలు' : 'Live updates'}</h2>
          <p>{lang === 'te'
            ? 'ఆధారపూర్వకమైన మరియు ధృవీకరించిన ప్రకటనలు మాత్రమే చూపబడతాయి.'
            : 'Only source-backed, verified announcements appear here.'}</p>
        </div>
      </div>
      <DiscoveryNotificationOptIn selectedDomainIds={selectedDomainIds} lang={lang} />

      {visibleState.status === 'loading' && (
        <div className="live-updates-state" role="status">
          {lang === 'te' ? 'ధృవీకరించిన ప్రకటనల కోసం వెతుకుతున్నాం…' : 'Loading verified announcements…'}
        </div>
      )}
      {visibleState.status === 'error' && (
        <div className="live-updates-state live-updates-error" role="status">
          {visibleState.error === 'not-configured'
            ? lang === 'te'
              ? 'ప్రత్యక్ష సమాచారం ఇంకా ఈ డిప్లాయ్‌మెంట్‌లో కాన్ఫిగర్ చేయలేదు.'
              : 'Live discovery is not configured on this deployment yet.'
            : lang === 'te'
              ? 'ప్రత్యక్ష సమాచారాన్ని ఇప్పుడు పొందలేకపోయాం. దయచేసి తర్వాత మళ్లీ ప్రయత్నించండి.'
              : 'Live updates are temporarily unavailable. Please try again later.'}
        </div>
      )}
      {visibleState.status === 'ready' && visibleState.opportunities.length === 0 && (
        <div className="live-updates-state">
          {lang === 'te'
            ? 'ఈ రంగాల్లో ప్రస్తుతం ధృవీకరించిన తాజా అవకాశాలు లేవు.'
            : 'There are no verified live opportunities in these domains right now.'}
        </div>
      )}
      {visibleState.status === 'ready' && visibleState.opportunities.length > 0 && (
        <div className="live-opportunity-grid">
          {visibleState.opportunities.map((opportunity) => opportunityCard(opportunity, lang))}
        </div>
      )}
      <p className="live-updates-disclaimer">
        {lang === 'te'
          ? 'దరఖాస్తు చేసే ముందు అధికారిక మూలాన్ని తెరిచి, తాజా నియమాలు మరియు గడువులను ధృవీకరించండి.'
          : 'Always open the official source to confirm current rules and deadlines before applying.'}
      </p>
    </section>
  )
}
