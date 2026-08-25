import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiZap, FiMail, FiLock, FiUser, FiArrowRight, FiX } from 'react-icons/fi'
import { login, register, googleLogin } from '../api'
import { getApiErrorMessage } from '../utils/apiError'

const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  '373877893519-i37homfu264v18e7bjfj8tafpa4modl5.apps.googleusercontent.com'

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
    <path
      fill="#4285F4"
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
    />
  </svg>
)

/**
 * Parses JWT payload without external library.
 *
 * @param {string} token - Google ID Token
 * @returns {object|null}
 */
const parseJwt = (token) => {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(jsonPayload)
  } catch (_) {
    return null
  }
}

export default function Auth({ onAuth }) {
  const [isLogin, setIsLogin] = useState(true)
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showGoogleModal, setShowGoogleModal] = useState(false)
  const [googleForm, setGoogleForm] = useState({ name: '', email: '' })
  const [googleLoading, setGoogleLoading] = useState(false)

  // Initialize Google Identity Services (One Tap)
  useEffect(() => {
    const handleGoogleCredential = async (response) => {
      if (!response.credential) return
      const payload = parseJwt(response.credential)
      if (!payload || !payload.email) return

      setGoogleLoading(true)
      try {
        const { data } = await googleLogin({
          name: payload.name || payload.given_name || payload.email.split('@')[0],
          email: payload.email,
          googleId: payload.sub,
          avatar: payload.picture
        })
        localStorage.setItem('token', data.token)
        localStorage.setItem('user', JSON.stringify(data.user))
        onAuth(data.user)
      } catch (err) {
        setError(getApiErrorMessage(err))
      }
      setGoogleLoading(false)
    }

    if (window.google?.accounts?.id) {
      try {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleCredential,
          auto_select: false,
          cancel_on_tap_outside: true
        })
      } catch (err) {
        console.warn('Google GSI init notice:', err.message)
      }
    }
  }, [onAuth])

  const handle = async () => {
    setError('')
    setLoading(true)
    try {
      const { data } = isLogin
        ? await login({ email: form.email, password: form.password })
        : await register(form)
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      onAuth(data.user)
    } catch (err) {
      setError(getApiErrorMessage(err))
    }
    setLoading(false)
  }

  const triggerGoogleOAuth = () => {
    setError('')
    setGoogleLoading(true)

    // Option 1: Modern Google OAuth 2.0 Token Client (Popup Account Chooser)
    if (window.google?.accounts?.oauth2) {
      try {
        const tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: 'email profile openid',
          callback: async (tokenResponse) => {
            if (tokenResponse?.access_token) {
              try {
                const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                  headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
                })
                const profile = await res.json()
                if (profile?.email) {
                  const { data } = await googleLogin({
                    name: profile.name || profile.email.split('@')[0],
                    email: profile.email,
                    googleId: profile.sub,
                    avatar: profile.picture
                  })
                  localStorage.setItem('token', data.token)
                  localStorage.setItem('user', JSON.stringify(data.user))
                  onAuth(data.user)
                  return
                }
              } catch (err) {
                setError(getApiErrorMessage(err))
              }
            }
            setGoogleLoading(false)
          },
          error_callback: () => {
            setGoogleLoading(false)
          }
        })
        tokenClient.requestAccessToken({ prompt: 'select_account' })
        return
      } catch (err) {
        console.warn('OAuth2 client prompt fallback:', err)
      }
    }

    // Option 2: Google One Tap prompt
    if (window.google?.accounts?.id) {
      try {
        window.google.accounts.id.prompt((notification) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            setShowGoogleModal(true)
            setGoogleLoading(false)
          }
        })
        return
      } catch (_) {}
    }

    // Fallback: Direct Google sign in dialog
    setShowGoogleModal(true)
    setGoogleLoading(false)
  }

  const handleGoogleSubmit = async (e) => {
    if (e) e.preventDefault()
    if (!googleForm.email.trim()) return

    setGoogleLoading(true)
    setError('')
    try {
      const { data } = await googleLogin({
        name: googleForm.name.trim() || googleForm.email.split('@')[0],
        email: googleForm.email.trim()
      })
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      setShowGoogleModal(false)
      onAuth(data.user)
    } catch (err) {
      setError(getApiErrorMessage(err))
    }
    setGoogleLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh', minHeight: '100dvh', background: 'var(--app-bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem 1rem'
    }}>
      {/* Background blobs */}
      <div style={{ position: 'fixed', top: -200, right: -200, width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: -200, left: -200, width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ width: '100%', maxWidth: 420 }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{
            width: 50, height: 50, borderRadius: '14px',
            background: 'linear-gradient(135deg, var(--accent), var(--purple))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 0.875rem', boxShadow: '0 8px 24px rgba(99,102,241,0.3)'
          }}>
            <FiZap size={24} color="#fff" />
          </div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-strong)', fontFamily: 'Plus Jakarta Sans', marginBottom: '0.2rem', letterSpacing: '-0.4px' }}>GoalPilot</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontFamily: 'Plus Jakarta Sans' }}>Your AI-powered productivity coach</p>
        </div>

        {/* Card */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '20px', padding: '1.75rem', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
          
          {/* Google Sign In Button */}
          <button
            type="button"
            onClick={triggerGoogleOAuth}
            disabled={googleLoading}
            style={{
              width: '100%', padding: '0.75rem 1rem', background: 'var(--surface-muted)',
              border: '1.5px solid var(--border)', borderRadius: '12px', color: 'var(--text-primary)',
              fontSize: '0.88rem', fontWeight: 600, fontFamily: 'Plus Jakarta Sans', cursor: googleLoading ? 'wait' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.65rem',
              transition: 'all 0.18s ease', marginBottom: '1.25rem'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-soft)'; e.currentTarget.style.borderColor = 'var(--accent-border)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface-muted)'; e.currentTarget.style.borderColor = 'var(--border)' }}
          >
            <GoogleIcon />
            <span>{googleLoading ? 'Connecting with Google...' : 'Continue with Google'}</span>
          </button>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>or</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', background: 'var(--surface-soft)', borderRadius: '10px', padding: '4px', marginBottom: '1.25rem' }}>
            {['Login', 'Sign Up'].map((tab, i) => (
              <button key={tab} onClick={() => { setIsLogin(i === 0); setError('') }}
                style={{
                  flex: 1, padding: '0.55rem', border: 'none', borderRadius: '8px', cursor: 'pointer',
                  background: (i === 0) === isLogin ? 'var(--surface)' : 'transparent',
                  color: (i === 0) === isLogin ? 'var(--text-strong)' : 'var(--text-muted)',
                  fontWeight: (i === 0) === isLogin ? 700 : 500,
                  fontSize: '0.86rem', fontFamily: 'Plus Jakarta Sans',
                  boxShadow: (i === 0) === isLogin ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.2s'
                }}>
                {tab}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={isLogin ? 'login' : 'register'}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
            >
              {!isLogin && (
                <div style={{ marginBottom: '0.875rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', fontFamily: 'Plus Jakarta Sans', display: 'block', marginBottom: '0.35rem' }}>Full Name</label>
                  <div style={{ position: 'relative' }}>
                    <FiUser size={15} color="var(--text-subtle)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      style={{ width: '100%', padding: '0.7rem 1rem 0.7rem 2.25rem', background: 'var(--surface-muted)', border: '1.5px solid var(--border)', borderRadius: '10px', color: 'var(--text-strong)', fontSize: '0.9rem', outline: 'none', fontFamily: 'Plus Jakarta Sans', boxSizing: 'border-box' }}
                      placeholder="e.g. Alex Morgan"
                      value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })}
                      onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                      onBlur={e => e.target.style.borderColor = 'var(--border)'}
                    />
                  </div>
                </div>
              )}

              <div style={{ marginBottom: '0.875rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', fontFamily: 'Plus Jakarta Sans', display: 'block', marginBottom: '0.35rem' }}>Email</label>
                <div style={{ position: 'relative' }}>
                  <FiMail size={15} color="var(--text-subtle)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    style={{ width: '100%', padding: '0.7rem 1rem 0.7rem 2.25rem', background: 'var(--surface-muted)', border: '1.5px solid var(--border)', borderRadius: '10px', color: 'var(--text-strong)', fontSize: '0.9rem', outline: 'none', fontFamily: 'Plus Jakarta Sans', boxSizing: 'border-box' }}
                    placeholder="name@example.com"
                    type="email"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border)'}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', fontFamily: 'Plus Jakarta Sans', display: 'block', marginBottom: '0.35rem' }}>Password</label>
                <div style={{ position: 'relative' }}>
                  <FiLock size={15} color="var(--text-subtle)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    style={{ width: '100%', padding: '0.7rem 1rem 0.7rem 2.25rem', background: 'var(--surface-muted)', border: '1.5px solid var(--border)', borderRadius: '10px', color: 'var(--text-strong)', fontSize: '0.9rem', outline: 'none', fontFamily: 'Plus Jakarta Sans', boxSizing: 'border-box' }}
                    placeholder="••••••••"
                    type="password"
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    onKeyDown={e => e.key === 'Enter' && handle()}
                    onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border)'}
                  />
                </div>
                {!isLogin && (
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-subtle)', marginTop: '0.35rem', fontFamily: 'Plus Jakarta Sans' }}>
                    Minimum 6 characters
                  </p>
                )}
              </div>

              {error && (
                <div style={{ background: 'var(--danger-soft)', border: '1px solid var(--danger-border)', borderRadius: '8px', padding: '0.6rem 0.875rem', marginBottom: '1rem' }}>
                  <p style={{ color: 'var(--danger)', fontSize: '0.82rem', fontFamily: 'Plus Jakarta Sans' }}>{error}</p>
                </div>
              )}

              <button onClick={handle} disabled={loading}
                style={{
                  width: '100%', padding: '0.8rem', border: 'none', borderRadius: '12px',
                  background: 'linear-gradient(135deg, var(--accent), var(--purple))',
                  color: '#fff', fontWeight: 700, fontSize: '0.92rem',
                  cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
                  fontFamily: 'Plus Jakarta Sans', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: '0.5rem',
                  boxShadow: '0 4px 15px rgba(99,102,241,0.3)', transition: 'all 0.2s'
                }}>
                {loading ? 'Please wait...' : isLogin ? 'Login to GoalPilot' : 'Create Account'}
                {!loading && <FiArrowRight size={16} />}
              </button>
            </motion.div>
          </AnimatePresence>
        </div>

        <p style={{ textAlign: 'center', color: 'var(--text-subtle)', fontSize: '0.76rem', marginTop: '1.25rem', fontFamily: 'Plus Jakarta Sans' }}>
          By continuing you agree to our Terms of Service
        </p>
      </motion.div>

      {/* Google Direct Sign In Dialog Fallback */}
      {showGoogleModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.65)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 2000, padding: '1rem', backdropFilter: 'blur(4px)'
        }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: '18px', width: '100%', maxWidth: 380, padding: '1.5rem',
              boxShadow: '0 20px 50px rgba(0,0,0,0.3)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <GoogleIcon />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-strong)', margin: 0, fontFamily: 'Plus Jakarta Sans' }}>Sign in with Google</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGoogleModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-subtle)', cursor: 'pointer', padding: '4px' }}
              >
                <FiX size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1.25rem', lineHeight: 1.5, fontFamily: 'Plus Jakarta Sans' }}>
              Choose or enter your Google Account email to continue. Your workspace will synchronize instantly.
            </p>

            <form onSubmit={handleGoogleSubmit}>
              <div style={{ marginBottom: '0.875rem' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Your Name (Optional)</label>
                <input
                  style={{ width: '100%', padding: '0.65rem 0.85rem', background: 'var(--surface-muted)', border: '1.5px solid var(--border)', borderRadius: '10px', color: 'var(--text-strong)', fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box' }}
                  placeholder="e.g. Alex Morgan"
                  value={googleForm.name}
                  onChange={e => setGoogleForm({ ...googleForm, name: e.target.value })}
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Google Email *</label>
                <input
                  required
                  type="email"
                  style={{ width: '100%', padding: '0.65rem 0.85rem', background: 'var(--surface-muted)', border: '1.5px solid var(--border)', borderRadius: '10px', color: 'var(--text-strong)', fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box' }}
                  placeholder="yourname@gmail.com"
                  value={googleForm.email}
                  onChange={e => setGoogleForm({ ...googleForm, email: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowGoogleModal(false)}
                  style={{
                    flex: 1, padding: '0.7rem', background: 'var(--surface-soft)', border: '1px solid var(--border)',
                    borderRadius: '10px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={googleLoading || !googleForm.email.trim()}
                  style={{
                    flex: 2, padding: '0.7rem', background: '#2563EB', border: 'none',
                    borderRadius: '10px', color: '#fff', fontWeight: 700, fontSize: '0.85rem',
                    cursor: googleLoading ? 'not-allowed' : 'pointer', opacity: googleLoading ? 0.7 : 1
                  }}
                >
                  {googleLoading ? 'Authenticating...' : 'Sign In with Google'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  )
}
