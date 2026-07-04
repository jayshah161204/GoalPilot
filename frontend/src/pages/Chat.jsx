import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiSend, FiZap, FiUser, FiPlus, FiTrash2, FiMessageSquare } from 'react-icons/fi'
import { getSessions, getSession, createSession, sendSessionMessage, deleteSession } from '../api'
import SessionSuggestions, { hasSessionSuggestions } from '../components/SessionSuggestions'
import { useAppShell } from '../context/AppShellContext'

export default function Chat() {
  const { showItemsAddedToast } = useAppShell()
  const [sessions, setSessions] = useState([])
  const [activeSession, setActiveSession] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [pendingSuggestions, setPendingSuggestions] = useState(null)
  const [suggestionNonce, setSuggestionNonce] = useState(0)
  const [fetchError, setFetchError] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => { fetchSessions() }, [])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const fetchSessions = async () => {
    setFetchError('')
    try {
      const { data } = await getSessions()
      setSessions(data)
      if (data.length > 0) loadSession(data[0]._id)
    } catch (err) {
      console.log(err)
      setFetchError('Failed to load chat sessions. Please check your connection.')
    }
  }

  const loadSession = async (id) => {
    try {
      const { data } = await getSession(id)
      setActiveSession(data)
      setMessages(data.messages)
    } catch (err) { console.error('[Chat] loadSession error:', err) }
  }

  const handleNewChat = async () => {
    try {
      const { data } = await createSession()
      setSessions(prev => [data, ...prev])
      setActiveSession(data)
      setMessages([])
    } catch (err) { console.error('[Chat] createSession error:', err) }
  }

  const handleDelete = async (id, e) => {
    e.stopPropagation()
    try {
      await deleteSession(id)
      const updated = sessions.filter(s => s._id !== id)
      setSessions(updated)
      if (activeSession?._id === id) {
        if (updated.length > 0) loadSession(updated[0]._id)
        else { setActiveSession(null); setMessages([]) }
      }
    } catch (err) { console.error('[Chat] deleteSession error:', err) }
  }

  const handleSend = async (text) => {
    const msg = text || input
    if (!msg.trim() || !activeSession) return
    setPendingSuggestions(null)
    setMessages(prev => [...prev, { role: 'user', content: msg }])
    setInput('')
    setLoading(true)
    try {
      const { data } = await sendSessionMessage(activeSession._id, msg)
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
      setSessions(prev => prev.map(s =>
        s._id === activeSession._id ? { ...s, title: data.session.title, updatedAt: data.session.updatedAt } : s
      ))
      if (hasSessionSuggestions(data.suggestions)) {
        setPendingSuggestions(data.suggestions)
        setSuggestionNonce(n => n + 1)
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong.' }])
    }
    setLoading(false)
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 4rem)', gap: '1rem' }}>
      {fetchError && (
        <div style={{ position: 'absolute', top: '1rem', left: '50%', transform: 'translateX(-50%)', background: 'var(--danger-soft)', border: '1px solid var(--danger-border)', borderRadius: '12px', padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', zIndex: 10 }}>
          <p style={{ color: 'var(--danger)', fontSize: '0.82rem', fontWeight: 600 }}>{fetchError}</p>
          <button onClick={fetchSessions} style={{ background: 'var(--danger)', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.35rem 0.75rem', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, fontFamily: 'Inter', flexShrink: 0 }}>Retry</button>
        </div>
      )}

      {/* Sessions Sidebar */}
      <div style={{
        width: '220px', flexShrink: 0,
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: '16px', display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
      }}>
        <div style={{ padding: '0.875rem', borderBottom: '1px solid var(--surface-soft)' }}>
          <button className="btn btn-primary" onClick={handleNewChat} style={{ width: '100%', justifyContent: 'center', padding: '0.6rem' }}>
            <FiPlus size={14} /> New Chat
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
          {sessions.length === 0 && (
            <p style={{ color: 'var(--text-subtle)', fontSize: '0.78rem', textAlign: 'center', padding: '1rem' }}>No chats yet</p>
          )}
          {sessions.map(session => (
            <div key={session._id} onClick={() => loadSession(session._id)}
              style={{
                padding: '0.6rem 0.75rem', borderRadius: '10px', cursor: 'pointer',
                background: activeSession?._id === session._id ? 'var(--accent-soft)' : 'transparent',
                border: activeSession?._id === session._id ? '1px solid var(--accent-border)' : '1px solid transparent',
                marginBottom: '0.25rem',
                display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.15s'
              }}>
              <FiMessageSquare size={12} color={activeSession?._id === session._id ? 'var(--accent)' : 'var(--text-subtle)'} style={{ flexShrink: 0 }} />
              <p style={{
                fontSize: '0.8rem',
                color: activeSession?._id === session._id ? 'var(--accent)' : 'var(--text-muted)',
                fontWeight: activeSession?._id === session._id ? 600 : 400,
                flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
              }}>
                {session.title || 'New Chat'}
              </p>
              <button onClick={(e) => handleDelete(session._id, e)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', flexShrink: 0, opacity: 0.3 }}
                onMouseEnter={e => e.currentTarget.style.opacity = 1}
                onMouseLeave={e => e.currentTarget.style.opacity = 0.3}>
                <FiTrash2 size={11} color="var(--danger)" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ marginBottom: '1rem' }}>
          <h1 className="page-title" style={{ marginBottom: '0.15rem', fontSize: '1.4rem' }}>AI Productivity Coach</h1>
          <p style={{ color: 'var(--text-subtle)', fontSize: '0.8rem' }}>Ask to add tasks, goals, notes, habits, or a daily plan — confirm below to save</p>
        </div>

        {!activeSession ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
            <FiMessageSquare size={40} color="var(--border)" />
            <p style={{ color: 'var(--text-subtle)', fontSize: '0.9rem' }}>Start a new chat</p>
            <button className="btn btn-primary" onClick={handleNewChat}><FiPlus size={14} /> New Chat</button>
          </div>
        ) : (
          <>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.875rem', marginBottom: '0.875rem', paddingRight: '0.25rem' }}>
              {messages.length === 0 && (
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                  {[
                    "I'm a 3rd year IT student with career anxiety",
                    "What should I focus on today?",
                    "I failed to complete my tasks, motivate me",
                    "Help me prioritize my goals"
                  ].map((s, i) => (
                    <button key={i} onClick={() => handleSend(s)} style={{
                      padding: '0.45rem 0.9rem',
                      background: 'var(--accent-soft)',
                      border: '1px solid var(--accent-border)',
                      borderRadius: '20px', color: 'var(--accent)',
                      fontSize: '0.8rem', cursor: 'pointer',
                      fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 500
                    }}>
                      {s}
                    </button>
                  ))}
                </div>
              )}

              <AnimatePresence>
                {messages.map((msg, i) => (
                  <motion.div key={i}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: '0.6rem', alignItems: 'flex-end' }}
                  >
                    {msg.role === 'assistant' && (
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                        background: 'linear-gradient(135deg, var(--accent), var(--purple))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        <FiZap size={12} color="#fff" />
                      </div>
                    )}
                    <div style={{
                      maxWidth: '68%', padding: '0.75rem 1rem',
                      borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                      background: msg.role === 'user' ? 'linear-gradient(135deg, var(--accent), var(--purple))' : 'var(--surface)',
                      border: msg.role === 'assistant' ? '1px solid var(--border)' : 'none',
                      color: msg.role === 'user' ? '#fff' : 'var(--text-strong)',
                      fontSize: '0.88rem', lineHeight: 1.65,
                      whiteSpace: 'pre-wrap',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
                    }}>
                      {msg.content}
                    </div>
                    {msg.role === 'user' && (
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                        background: 'var(--accent-soft)', border: '1px solid var(--accent-border)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        <FiUser size={12} color="var(--accent)" />
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              {loading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-end' }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--accent), var(--purple))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                  }}>
                    <FiZap size={12} color="#fff" />
                  </div>
                  <div style={{ display: 'flex', gap: '4px', padding: '0.75rem 1rem', background: 'var(--surface)', borderRadius: '18px 18px 18px 4px', border: '1px solid var(--border)', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                    {[0,1,2].map(i => (
                      <motion.div key={i}
                        animate={{ y: [0,-5,0] }}
                        transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.15 }}
                        style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
              <div ref={bottomRef} />
            </div>

            {pendingSuggestions && (
              <SessionSuggestions
                key={suggestionNonce}
                suggestions={pendingSuggestions}
                onDismiss={() => setPendingSuggestions(null)}
                onApplied={(patch) => {
                  setPendingSuggestions(null)
                  showItemsAddedToast(patch)
                }}
              />
            )}

            <div style={{
              display: 'flex', gap: '0.6rem', alignItems: 'center',
              background: 'var(--surface)', border: '1.5px solid var(--border)',
              borderRadius: '14px', padding: '0.4rem 0.4rem 0.4rem 1rem',
              boxShadow: '0 1px 4px rgba(0,0,0,0.05)'
            }}>
              <input className="input"
                placeholder="Ask your AI coach anything..."
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                style={{ border: 'none', background: 'transparent', boxShadow: 'none', padding: '0.4rem 0' }}
              />
              <button className="btn btn-primary" onClick={() => handleSend()}
                disabled={loading}
                style={{ borderRadius: '10px', padding: '0.6rem 1rem', flexShrink: 0 }}>
                <FiSend size={13} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
