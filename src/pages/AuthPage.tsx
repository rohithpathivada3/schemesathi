import { useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { supabase } from '../lib/supabase'

type AuthMode = 'login' | 'register' | 'forgot' | 'reset'

function authMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return 'The request could not be completed.'
}

export function AuthPage({ mode }: { mode: AuthMode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    setError('')
    setSuccess('')
  }, [mode])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (!supabase) {
      setError('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
      return
    }
    if (!email.trim()) {
      setError('Enter your email address.')
      return
    }
    if (mode === 'register' && !fullName.trim()) {
      setError('Enter your full name.')
      return
    }
    if ((mode === 'login' || mode === 'register' || mode === 'reset') && password.length < 8) {
      setError('Password must contain at least 8 characters.')
      return
    }
    if ((mode === 'register' || mode === 'reset') && password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (mode === 'register' && !acceptedTerms) {
      setError('Accept the Terms and Privacy Policy to continue.')
      return
    }

    setBusy(true)
    try {
      if (mode === 'forgot') {
        const redirectTo = `${window.location.origin}/reset-password`
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo })
        if (resetError) throw resetError
        setSuccess('Password recovery email sent. Check your inbox and spam folder.')
      } else if (mode === 'reset') {
        const { error: updateError } = await supabase.auth.updateUser({ password })
        if (updateError) throw updateError
        setSuccess('Password updated successfully.')
        setTimeout(() => navigate('/login', { replace: true }), 1200)
      } else if (mode === 'register') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { full_name: fullName.trim() },
            emailRedirectTo: `${window.location.origin}/dashboard`,
          },
        })
        if (signUpError) throw signUpError
        if (data.session) navigate('/dashboard', { replace: true })
        else setSuccess('Account created. Check your email and verify your address before signing in.')
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })
        if (signInError) throw signInError
        if (!rememberMe) {
          await supabase.auth.updateUser({ data: {} })
        }
        const from = (location.state as { from?: string } | null)?.from
        navigate(from && from !== '/login' ? from : '/dashboard', { replace: true })
      }
    } catch (caught) {
      setError(authMessage(caught))
    } finally {
      setBusy(false)
    }
  }

  const title =
    mode === 'register' ? 'Create your account'
      : mode === 'forgot' ? 'Forgot your password?'
        : mode === 'reset' ? 'Set a new password'
          : 'Welcome back'

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="auth-page-title">
        <Link className="auth-back" to="/"><ArrowLeft size={15} /> Back to home</Link>
        <p className="section-kicker">SCHEMESATHI ACCOUNT</p>
        <h1 id="auth-page-title">{title}</h1>
        <p className="auth-page-description">
          {mode === 'register'
            ? 'Create a secure account to save schemes and manage your application activity.'
            : mode === 'forgot'
              ? 'Enter your registered email to receive a secure reset link.'
              : mode === 'reset'
                ? 'Choose a strong password you have not used elsewhere.'
                : 'Sign in to access your profile and personalized dashboard.'}
        </p>

        <form className="auth-page-form" onSubmit={handleSubmit}>
          {mode === 'register' && (
            <label>
              Full Name
              <input value={fullName} onChange={(event) => setFullName(event.target.value)} autoComplete="name" placeholder="Your full name" />
            </label>
          )}
          {mode !== 'reset' && (
            <label>
              Email Address
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="you@example.com" required />
            </label>
          )}
          {(mode === 'login' || mode === 'register' || mode === 'reset') && (
            <label>
              Password
              <span className="auth-password-field">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  minLength={8}
                  required
                />
                <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </span>
            </label>
          )}
          {(mode === 'register' || mode === 'reset') && (
            <label>
              Confirm Password
              <input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" minLength={8} required />
            </label>
          )}
          {mode === 'login' && (
            <div className="auth-options">
              <label><input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} /> Remember me</label>
              <Link to="/forgot-password">Forgot password?</Link>
            </div>
          )}
          {mode === 'register' && (
            <label className="terms-check">
              <input type="checkbox" checked={acceptedTerms} onChange={(event) => setAcceptedTerms(event.target.checked)} />
              <span>I accept the Terms and Privacy Policy.</span>
            </label>
          )}
          {error && <p className="auth-error" role="alert">{error}</p>}
          {success && <p className="auth-success" role="status">{success}</p>}
          <button type="submit" className="auth-submit" disabled={busy}>
            {busy ? 'Please wait...' : mode === 'register' ? 'Create Account' : mode === 'forgot' ? 'Send Reset Link' : mode === 'reset' ? 'Update Password' : 'Sign In'}
          </button>
        </form>

        <div className="auth-switch">
          {mode === 'login' && <><span>New to SchemeSathi?</span> <Link to="/register">Create an account</Link></>}
          {mode === 'register' && <><span>Already have an account?</span> <Link to="/login">Sign in</Link></>}
          {(mode === 'forgot' || mode === 'reset') && <Link to="/login">Back to sign in</Link>}
        </div>
        <p className="auth-privacy"><ShieldCheck size={14} /> SchemeSathi never asks for Aadhaar or bank account details.</p>
      </section>
    </main>
  )
}
