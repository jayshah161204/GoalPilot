import { useState, useEffect, useLayoutEffect } from 'react'
import { motion } from 'framer-motion'
import {
  FiCheckSquare, FiFileText, FiTarget, FiMessageSquare, FiZap, FiGrid,
  FiCalendar, FiLogOut, FiUser, FiChevronLeft, FiChevronRight, FiMoon, FiSun,
  FiMenu, FiX
} from 'react-icons/fi'
import Dashboard from './pages/Dashboard'
import Tasks from './pages/Tasks'
import Notes from './pages/Notes'
import Goals from './pages/Goals'
import Chat from './pages/Chat'
import Planner from './pages/Planner'
import Auth from './pages/Auth'
import Habits from './pages/Habits'
import FloatingAssistant from './components/FloatingAssistant'
import { AppShellProvider } from './context/AppShellContext'
import './index.css'

const tabs = [
  { id: 'dashboard', label: 'Dashboard', icon: FiGrid },
  { id: 'tasks', label: 'Tasks', icon: FiCheckSquare },
  { id: 'notes', label: 'Notes', icon: FiFileText },
  { id: 'goals', label: 'Goals', icon: FiTarget },
  { id: 'habits', label: 'Habits', icon: FiZap },
  { id: 'planner', label: 'Daily Plan', icon: FiCalendar },
  { id: 'chat', label: 'AI Coach', icon: FiMessageSquare },
]

const bottomNavTabs = [
  { id: 'dashboard', label: 'Home', icon: FiGrid },
  { id: 'tasks', label: 'Tasks', icon: FiCheckSquare },
  { id: 'habits', label: 'Habits', icon: FiZap },
  { id: 'planner', label: 'Plan', icon: FiCalendar },
  { id: 'chat', label: 'AI Coach', icon: FiMessageSquare },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sidebarCollapsed') === 'true')
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme')
    if (saved === 'light' || saved === 'dark') return saved
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  useEffect(() => { localStorage.setItem('sidebarCollapsed', collapsed) }, [collapsed])
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
    localStorage.setItem('theme', theme)
  }, [theme])

  useEffect(() => {
    const saved = localStorage.getItem('user')
    const token = localStorage.getItem('token')
    if (saved && token) setUser(JSON.parse(saved))
    setChecking(false)
  }, [])

  const handleAuth = (userData) => setUser(userData)

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
    setActiveTab('dashboard')
    setMobileMenuOpen(false)
  }

  const toggleTheme = () => setTheme(current => current === 'dark' ? 'light' : 'dark')

  const handleSelectTab = (tabId) => {
    setActiveTab(tabId)
    setMobileMenuOpen(false)
  }

  const themeToggle = (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? <FiSun size={15} /> : <FiMoon size={15} />}
    </button>
  )

  if (checking) return null
  if (!user) return <><div className="auth-theme-toggle">{themeToggle}</div><Auth onAuth={handleAuth} /></>

  return (
    <AppShellProvider navigateTo={handleSelectTab}>
    <div className="app">
      {/* Mobile Top Header */}
      <header className="mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: 28, height: 28, borderRadius: '8px',
            background: 'linear-gradient(135deg, var(--accent), var(--accent-secondary))',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <FiZap size={16} color="#fff" />
          </div>
          <span style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>GoalPilot</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {themeToggle}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(o => !o)}
            aria-label="Toggle navigation menu"
            style={{
              background: 'var(--surface-soft)', border: '1px solid var(--border)',
              borderRadius: '8px', width: 34, height: 34, display: 'flex',
              alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)',
              cursor: 'pointer'
            }}
          >
            {mobileMenuOpen ? <FiX size={18} /> : <FiMenu size={18} />}
          </button>
        </div>
      </header>

      {/* Backdrop for mobile drawer */}
      {mobileMenuOpen && (
        <div className="sidebar-backdrop" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Sidebar (Desktop Persistent / Mobile Drawer) */}
      <div className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="logo">
          <FiZap size={20} />
          {!collapsed && <span>GoalPilot</span>}
          <button onClick={() => setCollapsed(c => !c)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 24, height: 24, borderRadius: '50%', border: '1px solid var(--border)',
              background: 'var(--surface-muted)', cursor: 'pointer', transition: 'all 0.18s',
              flexShrink: 0, marginLeft: collapsed ? '0' : 'auto', padding: 0
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-soft)'; e.currentTarget.style.borderColor = 'var(--accent-border)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface-muted)'; e.currentTarget.style.borderColor = 'var(--border)' }}>
            {collapsed ? <FiChevronRight size={12} color="var(--text-muted)" /> : <FiChevronLeft size={12} color="var(--text-muted)" />}
          </button>
        </div>

        <nav>
          {tabs.map(tab => (
            <button key={tab.id} className={`nav-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => handleSelectTab(tab.id)}>
              <tab.icon size={16} color={activeTab === tab.id ? 'var(--accent)' : 'var(--text-subtle)'} />
              {(!collapsed || mobileMenuOpen) && <span>{tab.label}</span>}
            </button>
          ))}
        </nav>

        <div style={{ marginTop: 'auto' }}>
          {(!collapsed || mobileMenuOpen) && (
          <div style={{
            padding: '0.75rem', borderRadius: '12px',
            background: 'var(--accent-soft)', border: '1px solid var(--accent-border)',
            marginBottom: '0.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--accent), var(--accent-secondary))',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <FiUser size={14} color="#fff" />
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'Inter' }}>{user.name}</p>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-subtle)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'Inter' }}>{user.email}</p>
              </div>
            </div>
          </div>
          )}
          <div className="sidebar-bottom-actions" style={{ display: 'flex', flexDirection: collapsed && !mobileMenuOpen ? 'column' : 'row', gap: '0.35rem' }}>
            <button
              onClick={toggleTheme}
              className="sidebar-action-btn"
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              style={{
                flex: collapsed && !mobileMenuOpen ? undefined : '0 0 auto',
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '0.6rem 0.875rem', border: 'none', background: 'transparent',
                color: 'var(--text-subtle)', borderRadius: '10px', cursor: 'pointer',
                fontSize: '0.82rem', fontFamily: 'Inter', fontWeight: 500, transition: 'all 0.18s',
                ...(collapsed && !mobileMenuOpen ? { justifyContent: 'center', width: '100%' } : {})
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-soft)'; e.currentTarget.style.color = 'var(--accent)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-subtle)' }}>
              {theme === 'dark' ? <FiSun size={14} /> : <FiMoon size={14} />}
              {(!collapsed || mobileMenuOpen) && (theme === 'dark' ? 'Light' : 'Dark')}
            </button>
            <button onClick={handleLogout}
              style={{
                flex: collapsed && !mobileMenuOpen ? undefined : 1,
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '0.6rem 0.875rem', border: 'none', background: 'transparent',
                color: 'var(--text-subtle)', borderRadius: '10px', cursor: 'pointer',
                fontSize: '0.82rem', fontFamily: 'Inter', fontWeight: 500, transition: 'all 0.18s',
                ...(collapsed && !mobileMenuOpen ? { justifyContent: 'center', width: '100%' } : {})
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--danger-soft)'; e.currentTarget.style.color = 'var(--danger)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-subtle)' }}>
              <FiLogOut size={14} />{(!collapsed || mobileMenuOpen) && ' Logout'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="main-content">
        <motion.div key={activeTab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}>
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'tasks' && <Tasks />}
          {activeTab === 'notes' && <Notes />}
          {activeTab === 'goals' && <Goals />}
          {activeTab === 'habits' && <Habits />}
          {activeTab === 'planner' && <Planner />}
          {activeTab === 'chat' && <Chat />}
        </motion.div>
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="mobile-bottom-nav">
        {bottomNavTabs.map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              className={`mobile-nav-item ${isActive ? 'active' : ''}`}
              onClick={() => handleSelectTab(tab.id)}
            >
              <Icon size={18} color={isActive ? 'var(--accent)' : 'var(--text-subtle)'} />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </nav>

      <FloatingAssistant />
    </div>
    </AppShellProvider>
  )
}

