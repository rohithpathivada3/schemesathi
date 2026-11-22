import { useEffect, useState } from 'react'
import { Bookmark, ExternalLink } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'
import { schemes } from '../data/schemes'

export function SavedSchemesPage() {
  const { user } = useAuth()
  const [ids, setIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase || !user) return
    supabase.from('saved_schemes').select('scheme_id').eq('user_id', user.id).then(({ data }) => {
      setIds(data?.map((row) => row.scheme_id) || [])
      setLoading(false)
    })
  }, [user])

  const remove = async (schemeId: string) => {
    if (!supabase || !user) return
    const { error } = await supabase.from('saved_schemes').delete().eq('user_id', user.id).eq('scheme_id', schemeId)
    if (!error) setIds((current) => current.filter((id) => id !== schemeId))
  }

  const saved = schemes.filter((scheme) => ids.includes(scheme.id))

  return (
    <main className="account-page">
      <header className="account-page-header"><div><p className="section-kicker">MY SCHEMES</p><h1>Saved Schemes</h1></div></header>
      {loading ? <p>Loading saved schemes...</p> : saved.length === 0 ? (
        <div className="account-empty"><Bookmark size={28} /><h2>No saved schemes yet</h2><p>Save a scheme from the scheme directory to find it here.</p><a className="btn-primary" href="/#discover">Explore schemes</a></div>
      ) : (
        <section className="saved-scheme-grid">
          {saved.map((scheme) => (
            <article className="saved-scheme-card" key={scheme.id}>
              <span className="scheme-category">{scheme.category}</span><h2>{scheme.name}</h2><p>{scheme.description}</p>
              <div className="saved-card-actions"><a href={scheme.officialUrl} target="_blank" rel="noreferrer">Official portal <ExternalLink size={13} /></a><button type="button" onClick={() => remove(scheme.id)}>Remove</button></div>
            </article>
          ))}
        </section>
      )}
    </main>
  )
}
