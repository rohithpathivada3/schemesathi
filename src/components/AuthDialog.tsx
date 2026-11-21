import { useEffect, useRef, useState, type FormEvent } from 'react'
import { FacebookAuthProvider, GoogleAuthProvider, browserLocalPersistence, browserSessionPersistence, createUserWithEmailAndPassword, sendPasswordResetEmail, setPersistence, signInWithEmailAndPassword, signInWithPopup, signOut, updateProfile, type User } from '@firebase/auth'
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, X } from 'lucide-react'
import { firebaseAuth, firebaseAuthConfigured } from '../lib/firebase'

type AuthDialogProps = {
  onClose: () => void
  user: User | null
}

type AuthMode = 'signin' | 'create' | 'reset'

type FormErrors = { email?: string; password?: string; general?: string; success?: string }

function messageForAuthError(error: unknown): string {
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : ''
  const messages: Record<string, string> = {
    'auth/email-already-in-use': 'An account already uses this email. Try signing in instead.',
    'auth/invalid-credential': 'That email or password did not match. Please try again.',
    'auth/invalid-email': 'Enter a valid email address.',
    'auth/popup-closed-by-user': 'The sign-in window closed before completing. You can try again.',
    'auth/account-exists-with-different-credential': 'An account already exists for this email with another sign-in method. Sign in with that method first.',
    'auth/operation-not-allowed': 'This sign-in method is not enabled for this Firebase project yet.',
    'auth/weak-password': 'Choose a password with at least 8 characters.',
    'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
    'auth/network-request-failed': 'A network error interrupted sign-in. Check your connection and try again.',
    'auth/unauthorized-domain': 'This website domain is not yet authorized in Firebase Authentication settings.',
  }
  return messages[code] ?? 'Sign-in could not be completed. Check your Firebase setup and try again.'
}

export function AuthDialog({ onClose, user }: AuthDialogProps) {
  const [mode, setMode] = useState<AuthMode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [keepSignedIn, setKeepSignedIn] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const dialogRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    dialogRef.current?.querySelector<HTMLElement>('button:not(:disabled), input:not(:disabled)')?.focus()
    return () => {
      if (previousFocus?.isConnected && previousFocus.getClientRects().length > 0) previousFocus.focus()
      else document.querySelector<HTMLElement>('.mobile-menu')?.focus()
    }
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose()
      if (event.key === 'Tab' && dialogRef.current) {
        const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled)'))
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last?.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first?.focus()
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [busy, onClose])

  const requireAuth = () => {
    if (!firebaseAuth) throw new Error('Firebase is not configured. Add the VITE_FIREBASE_* settings and enable sign-in providers in Firebase Console.')
    return firebaseAuth
  }

  const persistSession = async () => {
    const auth = requireAuth()
    await setPersistence(auth, keepSignedIn ? browserLocalPersistence : browserSessionPersistence)
    return auth
  }

  const handleEmailSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrors({})
    setBusy(true)
    try {
      const auth = await persistSession()
      if (mode === 'reset') {
        await sendPasswordResetEmail(auth, email.trim())
        setErrors({ success: 'Password reset link sent. Check your email.' })
      } else if (mode === 'create') {
        const credential = await createUserWithEmailAndPassword(auth, email.trim(), password)
        if (name.trim()) await updateProfile(credential.user, { displayName: name.trim() })
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password)
      }
    } catch (error) {
      setErrors({ general: error instanceof Error && error.message.startsWith('Firebase is not configured') ? error.message : messageForAuthError(error) })
    } finally {
      setBusy(false)
    }
  }

  const handleSocialSignIn = async (providerName: 'google' | 'facebook') => {
    setErrors({})
    setBusy(true)
    try {
      const auth = await persistSession()
      const provider = providerName === 'google' ? new GoogleAuthProvider() : new FacebookAuthProvider()
      if (providerName === 'google') provider.setCustomParameters({ prompt: 'select_account' })
      provider.addScope('email')
      await signInWithPopup(auth, provider)
    } catch (error) {
      setErrors({ general: error instanceof Error && error.message.startsWith('Firebase is not configured') ? error.message : messageForAuthError(error) })
    } finally {
      setBusy(false)
    }
  }

  const handleSignOut = async () => {
    setBusy(true)
    try {
      if (!firebaseAuth) throw new Error('Authentication is not configured.')
      await signOut(firebaseAuth)
      onClose()
    } catch (error) {
      setErrors({ general: messageForAuthError(error) })
    } finally {
      setBusy(false)
    }
  }

  const title = mode === 'create' ? 'Create your account' : mode === 'reset' ? 'Reset your password' : 'Welcome back'
  const description = mode === 'create'
    ? 'Create a secure sign-in. Your scheme profile stays on this device in this MVP.'
    : mode === 'reset'
      ? 'We’ll email you a secure password reset link.'
      : 'Sign in to access your account. Scheme profile details stay on this device.'

  return (
    <div className="auth-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose() }}>
      <section className="auth-dialog" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <div className="auth-topline"><span className="auth-brand"><span className="auth-brand-icon"><LockKeyhole size={17} /></span> SchemeSathi</span><button className="modal-close" onClick={onClose} aria-label="Close sign in" disabled={busy}><X size={19} /></button></div>
        {user ? <div className="auth-account-state"><span className="auth-success-icon"><Check size={23} /></span><p className="section-kicker">ACCOUNT CONNECTED</p><h2 id="auth-title">You’re signed in</h2><p className="auth-description">{user.displayName || user.email || 'Your account'} is signed in on this device.</p><button className="auth-submit secondary" type="button" onClick={handleSignOut} disabled={busy}>{busy ? 'Please wait…' : 'Sign out'}</button><p className="auth-privacy"><ShieldCheck size={14} /> Your scheme profile stays on this device. Firebase and your selected provider process account sign-in information.</p></div> : <>
          <div className="auth-heading"><p className="section-kicker">YOUR SCHEMES, ONE PLACE</p><h2 id="auth-title">{title}</h2><p className="auth-description">{description}</p></div>
          {!firebaseAuthConfigured && <p className="auth-setup-notice" role="note">Sign-in is not connected yet. Add Firebase settings from <span>README.md → Configure sign-in</span> to activate email and social accounts.</p>}
          {mode !== 'reset' && <div className="social-auth-buttons"><button type="button" className="social-auth google-auth" onClick={() => handleSocialSignIn('google')} disabled={busy}><span className="google-g">G</span> Continue with Google</button><button type="button" className="social-auth facebook-auth" onClick={() => handleSocialSignIn('facebook')} disabled={busy}><span className="facebook-f">f</span> Continue with Facebook</button></div>}
          {mode !== 'reset' && <div className="auth-divider"><span>or use email</span></div>}
          <form className="auth-form" onSubmit={handleEmailSubmit}>
            {mode === 'create' && <label className="auth-label">Name <input type="text" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name (optional)" /></label>}
            <label className="auth-label">Email address <span className="auth-input"><Mail size={16} /><input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></span></label>
            {mode !== 'reset' && <label className="auth-label">Password <span className="auth-input"><LockKeyhole size={16} /><input type={showPassword ? 'text' : 'password'} autoComplete={mode === 'create' ? 'new-password' : 'current-password'} minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" /><button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></span></label>}
            {mode !== 'reset' && <label className="remember-option"><input type="checkbox" checked={keepSignedIn} onChange={(event) => setKeepSignedIn(event.target.checked)} /> Keep me signed in on this device</label>}
            {errors.general && <p className="auth-error" role="alert">{errors.general}</p>}
            {errors.success && <p className="auth-success-message" role="status">{errors.success}</p>}
            <button type="submit" className="auth-submit" disabled={busy}>{busy ? 'Please wait…' : mode === 'create' ? 'Create account' : mode === 'reset' ? 'Send reset link' : 'Sign in'} <ArrowRight size={16} /></button>
          </form>
          <div className="auth-links">
            {mode === 'signin' && <><button type="button" onClick={() => { setMode('reset'); setErrors({}) }}>Forgot password?</button><p>New to SchemeSathi? <button type="button" onClick={() => { setMode('create'); setErrors({}) }}>Create an account</button></p></>}
            {mode === 'create' && <p>Already have an account? <button type="button" onClick={() => { setMode('signin'); setErrors({}) }}>Sign in</button></p>}
            {mode === 'reset' && <button type="button" className="back-to-signin" onClick={() => { setMode('signin'); setErrors({}) }}><ArrowLeft size={14} /> Back to sign in</button>}
          </div>
          <p className="auth-privacy"><ShieldCheck size={14} /> We never ask for Aadhaar, bank details, or scheme profile data to create an account.</p>
        </>}
      </section>
    </div>
  )
}
