import { useEffect, useState } from 'react'
import type { Scheme } from '../data/schemes'
import type { Language } from '../data/translations'
import { discoveryDomains, type DiscoveryDomainId } from '../lib/domainMatching'

type Props = {
  schemes: Scheme[]
  savedSchemeIds: string[]
  recentlyViewedIds: string[]
  recentStorageAvailable: boolean
  selectedDomainIds: DiscoveryDomainId[]
  lang: Language
}

function validDeadline(value?: string): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const date = new Date(`${value}T00:00:00.000Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
    ? value
    : null
}

function SchemeLinks({ schemes, emptyText }: { schemes: Scheme[]; emptyText: string }) {
  if (schemes.length === 0) {
    return <p className="dashboard-empty">{emptyText}</p>
  }
  return (
    <ul className="dashboard-scheme-list">
      {schemes.map((scheme) => (
        <li key={scheme.id}>
          <a href={scheme.officialUrl} target="_blank" rel="noreferrer">
            {scheme.name}
          </a>
          <small>{scheme.department}</small>
        </li>
      ))}
    </ul>
  )
}

export function PersonalizedDashboard({
  schemes,
  savedSchemeIds,
  recentlyViewedIds,
  recentStorageAvailable,
  selectedDomainIds,
  lang,
}: Props) {
  const selectedDomainNames = discoveryDomains
    .filter((domain) => selectedDomainIds.includes(domain.id))
    .map((domain) => domain.label[lang])
  const savedSchemes = schemes.filter((scheme) => savedSchemeIds.includes(scheme.id))
  const recentSchemes = recentlyViewedIds
    .map((id) => schemes.find((scheme) => scheme.id === id))
    .filter((scheme): scheme is Scheme => Boolean(scheme))
  const recommendations = schemes.filter((scheme) => !savedSchemeIds.includes(scheme.id)).slice(0, 3)
  const [today, setToday] = useState<string | null>(null)
  useEffect(() => {
    const timer = window.setTimeout(() => setToday(new Date().toISOString().slice(0, 10)), 0)
    return () => window.clearTimeout(timer)
  }, [])
  const upcomingDeadlines = schemes
    .map((scheme) => ({ scheme, deadline: validDeadline(scheme.deadline) }))
    .filter((entry): entry is { scheme: Scheme; deadline: string } =>
      Boolean(today && entry.deadline && entry.deadline >= today)
    )
    .sort((left, right) => left.deadline.localeCompare(right.deadline))
    .slice(0, 3)

  return (
    <section className="personalized-dashboard" id="dashboard" aria-labelledby="dashboard-title">
      <div className="dashboard-section-heading">
        <div>
          <p className="section-kicker">{lang === 'te' ? 'మీ అన్వేషణ' : 'YOUR DISCOVERY'}</p>
          <h2 id="dashboard-title">{lang === 'te' ? 'మీ డాష్‌బోర్డ్' : 'Your dashboard'}</h2>
          <p>
            {lang === 'te'
              ? 'మీ ఎంపిక చేసిన రంగాలు, సేవ్ చేసిన పథకాలు, మరియు ఇటీవల చూసిన పథకాల ఆధారంగా.'
              : 'Based on your selected domains, saved schemes, and recent views on this device.'}
          </p>
        </div>
        <span className="dashboard-domain-summary">
          {selectedDomainNames.length > 0
            ? selectedDomainNames.join(', ')
            : (lang === 'te' ? 'అన్ని రంగాలు' : 'All domains')}
        </span>
      </div>

      <div className="dashboard-summary-grid">
        <article>
          <span>{lang === 'te' ? 'సంబంధిత పథకాలు' : 'Relevant schemes'}</span>
          <strong>{schemes.length}</strong>
        </article>
        <article>
          <span>{lang === 'te' ? 'సేవ్ చేసినవి' : 'Saved schemes'}</span>
          <strong>{savedSchemes.length}</strong>
        </article>
        <article>
          <span>{lang === 'te' ? 'ఎంచుకున్న రంగాలు' : 'Selected domains'}</span>
          <strong>{selectedDomainIds.length || discoveryDomains.length}</strong>
        </article>
      </div>

      <div className="dashboard-content-grid">
        <article className="dashboard-content-card">
          <h3>{lang === 'te' ? 'మీ రంగాలకు సంబంధించినవి' : 'Explore your domains'}</h3>
          <p>{lang === 'te' ? 'ఇవి రంగాల ఆధారిత సూచనలు మాత్రమే; అర్హత నిర్ణయం కాదు.' : 'Domain-based suggestions only; not an eligibility decision.'}</p>
          <SchemeLinks
            schemes={recommendations}
            emptyText={lang === 'te' ? 'ఈ రంగాల్లో పథకాలు లేవు.' : 'No schemes are currently listed in these domains.'}
          />
        </article>

        <article className="dashboard-content-card">
          <h3>{lang === 'te' ? 'సేవ్ చేసిన పథకాలు' : 'Saved schemes'}</h3>
          <SchemeLinks
            schemes={savedSchemes}
            emptyText={lang === 'te' ? 'మీరు ఇంకా పథకాలను సేవ్ చేయలేదు.' : 'You have not saved any schemes in these domains yet.'}
          />
        </article>

        <article className="dashboard-content-card">
          <h3>{lang === 'te' ? 'దగ్గరపడుతున్న గడువులు' : 'Upcoming deadlines'}</h3>
          {upcomingDeadlines.length > 0 ? (
            <ul className="dashboard-scheme-list">
              {upcomingDeadlines.map(({ scheme, deadline }) => (
                <li key={scheme.id}>
                  <a href={scheme.officialUrl} target="_blank" rel="noreferrer">{scheme.name}</a>
                  <small>{lang === 'te' ? `గడువు: ${deadline}` : `Deadline: ${deadline}`}</small>
                </li>
              ))}
            </ul>
          ) : (
            <p className="dashboard-empty">
              {lang === 'te'
                ? 'ప్రస్తుత జాబితాలో ధృవీకరించిన తేదీ గడువులు లేవు.'
                : 'No verified date-based deadlines are listed for these schemes.'}
            </p>
          )}
        </article>

        <article className="dashboard-content-card">
          <h3>{lang === 'te' ? 'ఇటీవల చూసినవి' : 'Recently viewed'}</h3>
          <SchemeLinks
            schemes={recentSchemes}
            emptyText={lang === 'te' ? 'మీరు చూసిన పథకాలు ఇక్కడ కనిపిస్తాయి.' : 'Schemes you view will appear here.'}
          />
          {!recentStorageAvailable && (
            <p className="dashboard-storage-warning" role="status">
              {lang === 'te' ? 'ఇటీవల చూసినవి ఈ పరికరంలో భద్రపరచబడలేదు.' : 'Recent views could not be saved in this browser.'}
            </p>
          )}
        </article>
      </div>

      <p className="dashboard-privacy-note">
        {lang === 'te'
          ? 'ఈ డాష్‌బోర్డ్ మీ పరికరంలోని ఎంపికలతో పనిచేస్తుంది; మీ ప్రొఫైల్ వివరాలు సర్వర్‌కు పంపబడవు.'
          : 'This dashboard uses preferences on this device; profile details are not sent to the server.'}
      </p>
    </section>
  )
}
