import { useEffect, useState } from 'react'
import { Bell, BellOff } from 'lucide-react'
import type { Language } from '../data/translations'
import type { DiscoveryDomainId } from '../lib/domainMatching'
import { getDiscoveryNotifications } from '../lib/discoveryNotifications'

const ENABLED_KEY = 'schemesathi_browser_notifications_enabled_v1'
const CURSOR_KEY = 'schemesathi_browser_notifications_cursor_v1'
const POLL_INTERVAL_MS = 120_000

type Props = {
  selectedDomainIds: DiscoveryDomainId[]
  lang: Language
}

function loadEnabled() {
  try {
    return typeof window !== 'undefined' &&
      'Notification' in window &&
      window.Notification.permission === 'granted' &&
      window.localStorage.getItem(ENABLED_KEY) === 'true'
  } catch {
    return false
  }
}

export function DiscoveryNotificationOptIn({ selectedDomainIds, lang }: Props) {
  const [enabled, setEnabled] = useState(loadEnabled)
  const [message, setMessage] = useState<'enabled' | 'disabled' | 'denied' | 'unsupported' | 'error' | null>(null)

  const labels = lang === 'te'
    ? {
      enable: 'బ్రౌజర్ హెచ్చరికలను ప్రారంభించండి',
      disable: 'బ్రౌజర్ హెచ్చరికలను నిలిపివేయండి',
      enabled: 'ఈ ట్యాబ్ తెరిచి ఉన్నప్పుడు కొత్త ధృవీకరించిన అవకాశాలపై హెచ్చరికలు వస్తాయి.',
      disabled: 'బ్రౌజర్ హెచ్చరికలు నిలిపివేయబడ్డాయి.',
      denied: 'హెచ్చరికల అనుమతి నిరాకరించబడింది. బ్రౌజర్ సెట్టింగ్‌లలో అనుమతించండి.',
      unsupported: 'ఈ బ్రౌజర్‌లో హెచ్చరికలు అందుబాటులో లేవు.',
      error: 'హెచ్చరికల స్థితిని సేవ్ చేయలేకపోయాం లేదా తాజా సమాచారం పొందలేకపోయాం.',
    }
    : {
      enable: 'Enable browser alerts',
      disable: 'Disable browser alerts',
      enabled: 'Alerts for new verified opportunities run only while this tab is open.',
      disabled: 'Browser alerts are disabled.',
      denied: 'Notification permission was denied. Allow it in your browser settings.',
      unsupported: 'Browser notifications are not available here.',
      error: 'Could not save your alert preference or load new notices.',
    }

  async function toggleNotifications() {
    setMessage(null)
    if (enabled) {
      try {
        window.localStorage.setItem(ENABLED_KEY, 'false')
      } catch {
        setMessage('error')
        return
      }
      setEnabled(false)
      setMessage('disabled')
      return
    }
    if (!('Notification' in window)) {
      setMessage('unsupported')
      return
    }

    let permission: NotificationPermission
    try {
      permission = await window.Notification.requestPermission()
    } catch {
      setMessage('denied')
      return
    }
    if (permission !== 'granted') {
      setMessage(permission === 'denied' ? 'denied' : 'unsupported')
      return
    }
    try {
      window.localStorage.setItem(ENABLED_KEY, 'true')
      window.localStorage.setItem(CURSOR_KEY, new Date().toISOString())
    } catch {
      setMessage('error')
      return
    }
    setEnabled(true)
    setMessage('enabled')
  }

  useEffect(() => {
    if (!enabled) return
    let active = true
    const poll = async () => {
      try {
        const cursor = window.localStorage.getItem(CURSOR_KEY)
        if (!cursor || window.Notification.permission !== 'granted') {
          if (active) setMessage('error')
          return
        }
        const requestStartedAt = new Date().toISOString()
        const notices = await getDiscoveryNotifications(cursor)
        if (!active) return
        const selectedDomains = new Set<string>(selectedDomainIds)
        const matchingNotices = notices.filter((notice) =>
          selectedDomainIds.length === 0 || selectedDomains.has(notice.categoryId)
        )
        for (const notice of matchingNotices) {
          const browserNotice = new window.Notification(notice.title, {
            body: lang === 'te' ? 'కొత్త ధృవీకరించిన ప్రభుత్వ/ప్రైవేట్ అవకాశం' : 'A new verified public opportunity is available.',
            tag: notice.id,
          })
          browserNotice.onclick = () => {
            window.open(notice.sourceUrl, '_blank', 'noopener,noreferrer')
          }
        }
        const latest = notices.length === 0
          ? requestStartedAt
          : notices.reduce((value, notice) =>
            Date.parse(notice.createdAt) > Date.parse(value) ? notice.createdAt : value,
          notices[0].createdAt)
        if (latest !== cursor) window.localStorage.setItem(CURSOR_KEY, latest)
        setMessage(null)
      } catch {
        if (active) setMessage('error')
      }
    }

    void poll()
    const timer = window.setInterval(() => { void poll() }, POLL_INTERVAL_MS)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [enabled, lang, selectedDomainIds])

  return (
    <div className="discovery-notification-opt-in">
      <button type="button" onClick={toggleNotifications} aria-pressed={enabled}>
        {enabled ? <BellOff size={16} aria-hidden="true" /> : <Bell size={16} aria-hidden="true" />}
        {enabled ? labels.disable : labels.enable}
      </button>
      {message && (
        <p role="status">
          {labels[message]}
        </p>
      )}
    </div>
  )
}
