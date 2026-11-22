import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'
import { schemes } from '../data/schemes'

type TrackingRow = {
  id: number
  scheme_id: string
  status: 'not_started' | 'preparing_documents' | 'submitted'
  notes: string
  visited_official_portal: boolean
}

export function ActivityPage() {
  const { user } = useAuth()
  const [rows, setRows] = useState<TrackingRow[]>([])
  const [selectedScheme, setSelectedScheme] = useState(schemes[0]?.id || '')
  const [status, setStatus] = useState<TrackingRow['status']>('not_started')
  const [notes, setNotes] = useState('')
  const [visited, setVisited] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!supabase || !user) return
    supabase.from('user_application_tracking').select('*').eq('user_id', user.id).then(({ data }) => setRows(data || []))
  }, [user])

  const handleSave = async (event: FormEvent) => {
    event.preventDefault()
    if (!supabase || !user || !selectedScheme) return
    const { error } = await supabase.from('user_application_tracking').upsert({
      user_id: user.id,
      scheme_id: selectedScheme,
      status,
      notes,
      visited_official_portal: visited,
    }, { onConflict: 'user_id,scheme_id' })
    if (error) setMessage(error.message)
    else {
      setMessage('Personal activity saved.')
      const { data } = await supabase.from('user_application_tracking').select('*').eq('user_id', user.id)
      setRows(data || [])
    }
  }

  return (
    <main className="account-page">
      <header className="account-page-header"><div><p className="section-kicker">PERSONAL RECORD</p><h1>Application Activity</h1></div></header>
      <div className="activity-layout">
        <form className="activity-form" onSubmit={handleSave}>
          <label>Scheme<select value={selectedScheme} onChange={(e) => setSelectedScheme(e.target.value)}>{schemes.map((scheme) => <option value={scheme.id} key={scheme.id}>{scheme.name}</option>)}</select></label>
          <label>Your Progress<select value={status} onChange={(e) => setStatus(e.target.value as TrackingRow['status'])}><option value="not_started">Not Started</option><option value="preparing_documents">Preparing Documents</option><option value="submitted">Submitted</option></select></label>
          <label><input type="checkbox" checked={visited} onChange={(e) => setVisited(e.target.checked)} /> I visited the official application portal</label>
          <label>Personal Notes<textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} placeholder="Documents, deadlines, or questions..." /></label>
          {message && <p className="account-message">{message}</p>}
          <button type="submit" className="btn-primary">Save Activity</button>
          <p className="activity-disclaimer">These entries are personal notes only. They do not confirm actual government application or approval status.</p>
        </form>
        <section className="activity-list">
          <h2>Activity History</h2>
          {rows.length === 0 ? <p className="account-empty-inline">No activity records yet.</p> : rows.map((row) => {
            const scheme = schemes.find((item) => item.id === row.scheme_id)
            return <article key={row.id}><h3>{scheme?.name || row.scheme_id}</h3><strong>{row.status.replaceAll('_', ' ')}</strong><p>{row.notes || 'No personal notes.'}</p>{row.visited_official_portal && <small>Official portal visited</small>}</article>
          })}
        </section>
      </div>
    </main>
  )
}
