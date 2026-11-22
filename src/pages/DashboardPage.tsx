import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bookmark, FileCheck2, Search, UserRound } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'

export function DashboardPage() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState(user?.user_metadata?.full_name || '')
  const [savedCount, setSavedCount] = useState(0)
  const [activityCount, setActivityCount] = useState(0)
  const [completion, setCompletion] = useState(0)

  useEffect(() => {
    if (!supabase || !user) return
    Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
      supabase.from('saved_schemes').select('scheme_id', { count: 'exact', head: false }).eq('user_id', user.id),
      supabase.from('user_activity').select('id', { count: 'exact', head: false }).eq('user_id', user.id),
    ]).then(([profileResult, savedResult, activityResult]) => {
      const profile = profileResult.data
      if (profile) {
        setName(profile.full_name || name)
        const fields = [profile.full_name, profile.date_of_birth, profile.state, profile.district, profile.occupation, profile.annual_family_income, profile.education_level, profile.residence_type]
        setCompletion(Math.round((fields.filter(Boolean).length / fields.length) * 100))
      }
      setSavedCount(savedResult.data?.length || 0)
      setActivityCount(activityResult.data?.length || 0)
    })
  }, [user])

  const logout = async () => {
    await signOut()
    navigate('/', { replace: true })
  }

  return (
    <main className="account-page">
      <header className="account-page-header dashboard-welcome">
        <div><p className="section-kicker">PERSONAL DASHBOARD</p><h1>Welcome, {name || 'Citizen'}!</h1></div>
        <button type="button" className="btn-secondary" onClick={logout}>Logout</button>
      </header>

      <section className="profile-completion">
        <div><strong>Profile completion</strong><span>{completion}% complete</span></div>
        <div className="completion-track"><span style={{ width: `${completion}%` }} /></div>
        <Link to="/profile">Update profile</Link>
      </section>

      <section className="dashboard-grid">
        <article className="dashboard-card"><Search /><div><small>Scheme matching</small><strong>Find My Schemes</strong><p>Check schemes against your profile.</p></div><Link to="/#eligibility-checker" className="dashboard-link">Open finder</Link></article>
        <article className="dashboard-card"><Bookmark /><div><small>Saved</small><strong>{savedCount}</strong><p>Saved government schemes</p></div><Link to="/saved" className="dashboard-link">View saved</Link></article>
        <article className="dashboard-card"><FileCheck2 /><div><small>Application activity</small><strong>{activityCount}</strong><p>Recent personal activity records</p></div><Link to="/activity" className="dashboard-link">Manage activity</Link></article>
        <article className="dashboard-card"><UserRound /><div><small>Account</small><strong>My Profile</strong><p>Update eligibility information.</p></div><Link to="/profile" className="dashboard-link">Edit profile</Link></article>
      </section>
    </main>
  )
}
