import { useState } from 'react'
import { Plus, Edit, Trash2, ShieldCheck, Check, X, Search, LogOut, Lock, AlertCircle, Building2, Eye, EyeOff } from 'lucide-react'
import type { Scheme } from '../data/schemes'
import type { Language } from '../data/translations'
import { translations } from '../data/translations'
import { adminLogin, type AdminUser } from '../lib/api'

type Props = {
  schemes: Scheme[]
  lang: Language
  onClose: () => void
  onUpdateSchemes: (updated: Scheme[]) => void
}

export function AdminPortal({ schemes, lang, onClose, onUpdateSchemes }: Props) {
  const t = translations[lang]

  const [adminUser, setAdminUser] = useState<AdminUser | null>(() => {
    try {
      const saved = sessionStorage.getItem('schemesathi_admin')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })

  const [email, setEmail] = useState('admin@schemesathi.in')
  const [password, setPassword] = useState('Admin@12345')
  const [showPassword, setShowPassword] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')

  // Edit / Add Modal
  const [editingScheme, setEditingScheme] = useState<Partial<Scheme> | null>(null)
  const [isNew, setIsNew] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoggingIn(true)
    setLoginError('')
    const res = await adminLogin(email, password)
    setIsLoggingIn(false)

    if (res.success && res.admin) {
      setAdminUser(res.admin)
      sessionStorage.setItem('schemesathi_admin', JSON.stringify(res.admin))
    } else {
      setLoginError(res.error || 'Invalid credentials')
    }
  }

  const handleLogout = () => {
    setAdminUser(null)
    sessionStorage.removeItem('schemesathi_admin')
  }

  const toggleStatus = (id: string) => {
    const updated = schemes.map(s => s.id === id ? { ...s, isActive: !s.isActive } : s)
    onUpdateSchemes(updated)
  }

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this scheme record?')) {
      const updated = schemes.filter(s => s.id !== id)
      onUpdateSchemes(updated)
    }
  }

  const handleSaveScheme = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingScheme?.name || !editingScheme?.id) return

    let updatedList: Scheme[]
    if (isNew) {
      const newRecord: Scheme = {
        id: editingScheme.id,
        name: editingScheme.name,
        nameTe: editingScheme.nameTe || '',
        governmentLevel: editingScheme.governmentLevel || 'Central',
        department: editingScheme.department || 'Government Department',
        departmentTe: editingScheme.departmentTe || '',
        description: editingScheme.description || '',
        descriptionTe: editingScheme.descriptionTe || '',
        benefit: editingScheme.benefit || null,
        benefitTe: editingScheme.benefitTe || '',
        category: editingScheme.category || 'Agriculture',
        tags: editingScheme.tags || ['General'],
        state: editingScheme.state || 'All India',
        officialUrl: editingScheme.officialUrl || 'https://india.gov.in',
        officialSourceUrl: editingScheme.officialSourceUrl || editingScheme.officialUrl || 'https://india.gov.in',
        sourceReference: editingScheme.sourceReference || 'Official Portal Guidelines',
        lastVerified: editingScheme.lastVerified || new Date().toISOString().split('T')[0],
        criteriaComplete: true,
        criteria: editingScheme.criteria || [],
        requiredDocuments: editingScheme.requiredDocuments || [],
        applicationSteps: editingScheme.applicationSteps || [],
        helpline: editingScheme.helpline || '1800-11-2026',
        deadline: editingScheme.deadline || 'Open throughout the year',
        isActive: true,
        color: editingScheme.color || 'blue',
        symbol: editingScheme.symbol || '📋'
      }
      updatedList = [newRecord, ...schemes]
    } else {
      updatedList = schemes.map(s => s.id === editingScheme.id ? { ...s, ...editingScheme } as Scheme : s)
    }

    onUpdateSchemes(updatedList)
    setEditingScheme(null)
  }

  const filteredSchemes = schemes.filter(s => {
    const matchesSearch = `${s.name} ${s.department} ${s.category}`.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCat = selectedCategory === 'all' || s.category === selectedCategory
    return matchesSearch && matchesCat
  })

  // If not signed in, show Admin Login view
  if (!adminUser) {
    return (
      <div className="scheme-modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
        <section className="scheme-modal admin-login-card" role="dialog" aria-modal="true">
          <div className="scheme-modal-header">
            <div>
              <span className="section-kicker"><Lock size={13} /> {t.navAdmin}</span>
              <h2>{lang === 'te' ? 'అడ్మినిస్ట్రేటర్ లాగిన్' : 'Administrator Sign In'}</h2>
              <p>{t.adminLoginPrompt}</p>
            </div>
            <button type="button" className="modal-close" onClick={onClose}><X size={20} /></button>
          </div>

          <div className="scheme-modal-content">
            <div className="admin-demo-creds">
              <span className="badge-pill">Demo Credentials Pre-filled</span>
              <p>Email: <code>admin@schemesathi.in</code> | Password: <code>Admin@12345</code></p>
            </div>

            {loginError && (
              <div className="auth-error-box">
                <AlertCircle size={15} /> <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="admin-form">
              <label className="admin-field">
                <span>{t.adminEmail}</span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@schemesathi.in"
                />
              </label>

              <label className="admin-field">
                <span>{t.adminPassword}</span>
                <div className="password-input-wrap">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </label>

              <button type="submit" disabled={isLoggingIn} className="btn-primary full-width">
                {isLoggingIn ? 'Signing In...' : t.adminSignInBtn}
              </button>
            </form>
          </div>
        </section>
      </div>
    )
  }

  // Admin Dashboard view
  return (
    <div className="scheme-modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <section className="scheme-modal admin-dashboard-modal" role="dialog" aria-modal="true">
        <div className="scheme-modal-header">
          <div>
            <div className="modal-kicker-row">
              <span className="section-kicker"><Building2 size={13} /> {t.adminTitle}</span>
              <span className="logged-in-pill"><ShieldCheck size={13} /> {adminUser.name} ({adminUser.role})</span>
            </div>
            <h2>Scheme Management & Eligibility Control</h2>
          </div>
          <div className="admin-header-actions">
            <button type="button" className="btn-secondary small" onClick={handleLogout} title="Sign Out">
              <LogOut size={14} /> {t.signOut}
            </button>
            <button type="button" className="modal-close" onClick={onClose}><X size={20} /></button>
          </div>
        </div>

        <div className="scheme-modal-content">
          {/* Quick Metrics Bar */}
          <div className="admin-stats-row">
            <div className="admin-stat-card">
              <small>{t.totalSchemes}</small>
              <strong>{schemes.length}</strong>
            </div>
            <div className="admin-stat-card">
              <small>{t.activeSchemes}</small>
              <strong className="text-success">{schemes.filter(s => s.isActive !== false).length}</strong>
            </div>
            <div className="admin-stat-card">
              <small>Central Schemes</small>
              <strong>{schemes.filter(s => s.governmentLevel === 'Central' || s.governmentLevel === 'Central / state programmes').length}</strong>
            </div>
            <div className="admin-stat-card">
              <small>Andhra Pradesh Schemes</small>
              <strong className="text-primary">{schemes.filter(s => s.state === 'Andhra Pradesh').length}</strong>
            </div>
          </div>

          {/* Admin Action Toolbar */}
          <div className="admin-toolbar">
            <div className="admin-search-wrap">
              <Search size={16} />
              <input
                type="search"
                placeholder="Search schemes by name, department, or tag..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="admin-filter-wrap">
              <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
                <option value="all">All Categories</option>
                <option value="Agriculture">Agriculture</option>
                <option value="Health">Health</option>
                <option value="Education">Education</option>
                <option value="Pension">Pension</option>
                <option value="Business">Business</option>
                <option value="Housing & energy">Housing & Energy</option>
                <option value="Women & child">Women & Child</option>
                <option value="Financial assistance">Financial Assistance</option>
              </select>
            </div>

            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                setIsNew(true)
                setEditingScheme({
                  id: `scheme-${Date.now().toString(36)}`,
                  name: '',
                  nameTe: '',
                  governmentLevel: 'Central',
                  department: '',
                  category: 'Agriculture',
                  state: 'All India',
                  description: '',
                  benefit: '',
                  officialUrl: '',
                  officialSourceUrl: '',
                  sourceReference: 'Official Guidelines',
                  lastVerified: new Date().toISOString().split('T')[0],
                  isActive: true,
                  color: 'blue',
                  symbol: '📋'
                })
              }}
            >
              <Plus size={16} /> {t.addSchemeBtn}
            </button>
          </div>

          {/* Schemes Management Table */}
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Scheme Name</th>
                  <th>Level & State</th>
                  <th>Category</th>
                  <th>Criteria Count</th>
                  <th>Last Verified</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSchemes.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <button
                        type="button"
                        className={`status-toggle-pill ${s.isActive !== false ? 'active' : 'inactive'}`}
                        onClick={() => toggleStatus(s.id)}
                        title="Click to toggle active status"
                      >
                        {s.isActive !== false ? <Check size={12} /> : <X size={12} />}
                        <span>{s.isActive !== false ? t.activeStatus : t.inactiveStatus}</span>
                      </button>
                    </td>
                    <td>
                      <div className="table-scheme-info">
                        <strong>{s.name}</strong>
                        <small>{s.department}</small>
                      </div>
                    </td>
                    <td>
                      <span className="level-chip">{s.governmentLevel}</span>
                      <small className="state-sub">{s.state}</small>
                    </td>
                    <td>
                      <span className="cat-chip">{s.category}</span>
                    </td>
                    <td>
                      <span className="criteria-count-tag">{s.criteria.length} rules</span>
                    </td>
                    <td>
                      <small className="verified-date">{s.lastVerified ?? 'Not verified'}</small>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          type="button"
                          className="action-icon-btn edit"
                          title="Edit Scheme Information"
                          onClick={() => {
                            setIsNew(false)
                            setEditingScheme({ ...s })
                          }}
                        >
                          <Edit size={15} />
                        </button>
                        <button
                          type="button"
                          className="action-icon-btn delete"
                          title="Delete Scheme"
                          onClick={() => handleDelete(s.id)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Edit / Add Scheme Modal */}
        {editingScheme && (
          <div className="admin-submodal-backdrop">
            <div className="admin-submodal">
              <div className="submodal-header">
                <h3>{isNew ? 'Add New Government Scheme' : `Edit: ${editingScheme.name}`}</h3>
                <button type="button" onClick={() => setEditingScheme(null)}><X size={18} /></button>
              </div>

              <form onSubmit={handleSaveScheme} className="submodal-form">
                <div className="form-grid-2">
                  <label className="admin-field">
                    <span>Scheme ID (Unique)</span>
                    <input
                      required
                      disabled={!isNew}
                      value={editingScheme.id || ''}
                      onChange={(e) => setEditingScheme({ ...editingScheme, id: e.target.value })}
                    />
                  </label>

                  <label className="admin-field">
                    <span>Government Level</span>
                    <select
                      value={editingScheme.governmentLevel || 'Central'}
                      onChange={(e) => setEditingScheme({ ...editingScheme, governmentLevel: e.target.value as any })}
                    >
                      <option value="Central">Central</option>
                      <option value="State">State</option>
                      <option value="Central / state programmes">Central / State Programmes</option>
                    </select>
                  </label>
                </div>

                <div className="form-grid-2">
                  <label className="admin-field">
                    <span>Scheme Name (English)</span>
                    <input
                      required
                      value={editingScheme.name || ''}
                      onChange={(e) => setEditingScheme({ ...editingScheme, name: e.target.value })}
                    />
                  </label>

                  <label className="admin-field">
                    <span>Scheme Name (Telugu)</span>
                    <input
                      value={editingScheme.nameTe || ''}
                      onChange={(e) => setEditingScheme({ ...editingScheme, nameTe: e.target.value })}
                      placeholder="పథకం పేరు (తెలుగు)"
                    />
                  </label>
                </div>

                <div className="form-grid-2">
                  <label className="admin-field">
                    <span>Department</span>
                    <input
                      required
                      value={editingScheme.department || ''}
                      onChange={(e) => setEditingScheme({ ...editingScheme, department: e.target.value })}
                    />
                  </label>

                  <label className="admin-field">
                    <span>Category</span>
                    <select
                      value={editingScheme.category || 'Agriculture'}
                      onChange={(e) => setEditingScheme({ ...editingScheme, category: e.target.value })}
                    >
                      <option value="Agriculture">Agriculture</option>
                      <option value="Health">Health</option>
                      <option value="Education">Education</option>
                      <option value="Pension">Pension</option>
                      <option value="Business">Business</option>
                      <option value="Housing & energy">Housing & Energy</option>
                      <option value="Women & child">Women & Child</option>
                      <option value="Financial assistance">Financial Assistance</option>
                    </select>
                  </label>
                </div>

                <div className="form-grid-2">
                  <label className="admin-field">
                    <span>State Jurisdiction</span>
                    <input
                      value={editingScheme.state || 'All India'}
                      onChange={(e) => setEditingScheme({ ...editingScheme, state: e.target.value })}
                    />
                  </label>

                  <label className="admin-field">
                    <span>Official Portal URL</span>
                    <input
                      type="url"
                      required
                      value={editingScheme.officialUrl || ''}
                      onChange={(e) => setEditingScheme({ ...editingScheme, officialUrl: e.target.value })}
                    />
                  </label>
                </div>

                <label className="admin-field">
                  <span>Description</span>
                  <textarea
                    rows={3}
                    value={editingScheme.description || ''}
                    onChange={(e) => setEditingScheme({ ...editingScheme, description: e.target.value })}
                  />
                </label>

                <label className="admin-field">
                  <span>Key Benefits Summary</span>
                  <textarea
                    rows={2}
                    value={editingScheme.benefit || ''}
                    onChange={(e) => setEditingScheme({ ...editingScheme, benefit: e.target.value })}
                    placeholder="e.g. ₹6,000 per year directly to bank account"
                  />
                </label>

                <div className="form-grid-2">
                  <label className="admin-field">
                    <span>Helpline / Contact Number</span>
                    <input
                      value={editingScheme.helpline || ''}
                      onChange={(e) => setEditingScheme({ ...editingScheme, helpline: e.target.value })}
                      placeholder="e.g. 1800-11-2026 / 1902"
                    />
                  </label>

                  <label className="admin-field">
                    <span>Last Verified Date</span>
                    <input
                      type="date"
                      value={editingScheme.lastVerified || ''}
                      onChange={(e) => setEditingScheme({ ...editingScheme, lastVerified: e.target.value })}
                    />
                  </label>
                </div>

                <div className="submodal-actions">
                  <button type="button" className="btn-secondary" onClick={() => setEditingScheme(null)}>Cancel</button>
                  <button type="submit" className="btn-primary">{isNew ? 'Create Scheme' : 'Save Changes'}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
