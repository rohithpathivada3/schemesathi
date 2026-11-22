import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

type Profile = {
  full_name: string
  date_of_birth: string
  state: string
  district: string
  occupation: string
  annual_family_income: string
  education_level: string
  residence_type: string
}

const emptyProfile: Profile = {
  full_name: '',
  date_of_birth: '',
  state: '',
  district: '',
  occupation: '',
  annual_family_income: '',
  education_level: '',
  residence_type: '',
}

export function ProfilePage() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<Profile>(emptyProfile)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!supabase || !user) return
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle().then(({ data }) => {
      if (data) {
        setProfile({
          full_name: data.full_name || '',
          date_of_birth: data.date_of_birth || '',
          state: data.state || '',
          district: data.district || '',
          occupation: data.occupation || '',
          annual_family_income: data.annual_family_income || '',
          education_level: data.education_level || '',
          residence_type: data.residence_type || '',
        })
      }
      setLoading(false)
    })
  }, [user])

  const save = async (event: FormEvent) => {
    event.preventDefault()
    if (!supabase || !user) return
    setBusy(true)
    setMessage('')
    const { error } = await supabase.from('profiles').update(profile).eq('id', user.id)
    if (!error) setMessage('Profile saved successfully.')
    else setMessage(error.message)
    setBusy(false)
  }

  const deleteAccount = async () => {
    if (!user || !supabase) return
    if (!window.confirm('Delete your SchemeSathi account and all saved personal data? This cannot be undone.')) return
    setBusy(true)
    const { error } = await supabase.rpc('delete_current_user')
    if (error) {
      setMessage(error.message)
    } else {
      setMessage('Account data deleted. Signing out...')
      await signOut()
      navigate('/', { replace: true })
    }
    setBusy(false)
  }

  if (loading) return <main className="account-page page-loading">Loading profile...</main>

  const update = (key: keyof Profile, value: string) => setProfile((current) => ({ ...current, [key]: value }))

  return (
    <main className="account-page">
      <header className="account-page-header">
        <div><p className="section-kicker">MY ACCOUNT</p><h1>My Profile</h1></div>
        <button type="button" className="btn-secondary" onClick={() => navigate('/dashboard')}>Back to dashboard</button>
      </header>
      <form className="profile-page-card" onSubmit={save}>
        <div className="profile-page-grid">
          <label>Full Name<input value={profile.full_name} onChange={(e) => update('full_name', e.target.value)} required /></label>
          <label>Email Address<input value={user?.email || ''} disabled /></label>
          <label>Date of Birth<input type="date" value={profile.date_of_birth} onChange={(e) => update('date_of_birth', e.target.value)} /></label>
          <label>State<input value={profile.state} onChange={(e) => update('state', e.target.value)} /></label>
          <label>District<input value={profile.district} onChange={(e) => update('district', e.target.value)} /></label>
          <label>Occupation<input value={profile.occupation} onChange={(e) => update('occupation', e.target.value)} /></label>
          <label>Annual Family Income
            <select value={profile.annual_family_income} onChange={(e) => update('annual_family_income', e.target.value)}>
              <option value="">Select income range</option><option>Below ₹1 lakh</option><option>₹1–2 lakh</option><option>₹2–5 lakh</option><option>₹5–8 lakh</option><option>Above ₹8 lakh</option>
            </select>
          </label>
          <label>Education Level
            <select value={profile.education_level} onChange={(e) => update('education_level', e.target.value)}>
              <option value="">Select education level</option><option>Below 10th</option><option>10th Pass</option><option>12th Pass</option><option>Diploma</option><option>Graduate</option><option>Postgraduate</option>
            </select>
          </label>
          <label>Residence
            <select value={profile.residence_type} onChange={(e) => update('residence_type', e.target.value)}>
              <option value="">Select residence</option><option>Rural</option><option>Urban</option>
            </select>
          </label>
        </div>
        {message && <p className="account-message" role="status">{message}</p>}
        <div className="profile-actions">
          <button type="submit" className="btn-primary" disabled={busy}>{busy ? 'Saving...' : 'Save Profile'}</button>
          <button type="button" className="danger-button" disabled={busy} onClick={deleteAccount}>Delete Account</button>
        </div>
      </form>
    </main>
  )
}
