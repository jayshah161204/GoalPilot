import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiZap, FiMail, FiLock, FiUser, FiArrowRight } from 'react-icons/fi'
import { login, register } from '../api'
import { getApiErrorMessage } from '../utils/apiError'

export default function Auth({ onAuth }) {
  const [isLogin, setIsLogin] = useState(true)
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--app-bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      {/* Background blobs */}
      <div style={{ position: 'fixed', top: -200, right: -200, width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: -200, left: -200, width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ width: '100%', maxWidth: 420, padding: '0 1.5rem' }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: 52, height: 52, borderRadius: '14px',
            background: 'linear-gradient(135deg, var(--accent), var(--purple))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1rem', boxShadow: '0 8px 24px rgba(99,102,241,0.3)'
          }}>
            <FiZap size={24} color="#fff" />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-strong)', fontFamily: 'Plus Jakarta Sans', marginBottom: '0.25rem' }}>GoalPilot</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', fontFamily: 'Plus Jakarta Sans' }}>Your AI-powered productivity coach</p>
        </div>

        {/* Card */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '20px', padding: '2rem', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', background: 'var(--surface-soft)', borderRadius: '10px', padding: '4px', marginBottom: '1.5rem' }}>
            {['Login', 'Sign Up'].map((tab, i) => (
              <button key={tab} onClick={() => { setIsLogin(i === 0); setError('') }}
                style={{
                  flex: 1, padding: '0.6rem', border: 'none', borderRadius: '8px', cursor: 'pointer',
                  background: (i === 0) === isLogin ? 'var(--surface)' : 'transparent',
                  color: (i === 0) === isLogin ? 'var(--text-strong)' : 'var(--text-muted)',
                  fontWeight: (i === 0) === isLogin ? 700 : 500,
                  fontSize: '0.88rem', fontFamily: 'Plus Jakarta Sans',
                  boxShadow: (i === 0) === isLogin ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.2s'
                }}>
                {tab}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={isLogin ? 'login' : 'register'}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
            >
              {!isLogin && (
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', fontFamily: 'Plus Jakarta Sans', display: 'block', marginBottom: '0.4rem' }}>Full Name</label>
                  <div style={{ position: 'relative' }}>
                    <FiUser size={15} color="var(--text-subtle)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.25rem', background: 'var(--surface-muted)', border: '1.5px solid var(--border)', borderRadius: '10px', color: 'var(--text-strong)', fontSize: '0.9rem', outline: 'none', fontFamily: 'Plus Jakarta Sans', boxSizing: 'border-box' }}
                      placeholder="Jay Shah"
                      value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })}
                      onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                      onBlur={e => e.target.style.borderColor = 'var(--border)'}
                    />
                  </div>
                </div>
              )}

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', fontFamily: 'Plus Jakarta Sans', display: 'block', marginBottom: '0.4rem' }}>Email</label>
                <div style={{ position: 'relative' }}>
                  <FiMail size={15} color="var(--text-subtle)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.25rem', background: 'var(--surface-muted)', border: '1.5px solid var(--border)', borderRadius: '10px', color: 'var(--text-strong)', fontSize: '0.9rem', outline: 'none', fontFamily: 'Plus Jakarta Sans', boxSizing: 'border-box' }}
                    placeholder="jay@example.com"
                    type="email"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border)'}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', fontFamily: 'Plus Jakarta Sans', display: 'block', marginBottom: '0.4rem' }}>Password</label>
                <div style={{ position: 'relative' }}>
                  <FiLock size={15} color="var(--text-subtle)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.25rem', background: 'var(--surface-muted)', border: '1.5px solid var(--border)', borderRadius: '10px', color: 'var(--text-strong)', fontSize: '0.9rem', outline: 'none', fontFamily: 'Plus Jakarta Sans', boxSizing: 'border-box' }}
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
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', marginTop: '0.35rem', fontFamily: 'Plus Jakarta Sans' }}>
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
                  width: '100%', padding: '0.85rem', border: 'none', borderRadius: '12px',
                  background: 'linear-gradient(135deg, var(--accent), var(--purple))',
                  color: '#fff', fontWeight: 700, fontSize: '0.95rem',
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

        <p style={{ textAlign: 'center', color: 'var(--text-subtle)', fontSize: '0.78rem', marginTop: '1.5rem', fontFamily: 'Plus Jakarta Sans' }}>
          By continuing you agree to our Terms of Service
        </p>
      </motion.div>
    </div>
  )
}
