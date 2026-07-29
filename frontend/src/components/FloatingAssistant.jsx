import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiMessageCircle, FiSend, FiX, FiZap } from 'react-icons/fi'
import { createSession, getSession, sendSessionMessage } from '../api'
import { useAppShell } from '../context/AppShellContext'
import SessionSuggestions, { hasSessionSuggestions } from './SessionSuggestions'

const POS_KEY = 'goalpilotFabPosition'
const SESS_KEY = 'goalpilotFloatingSessionId'

const FAB = 52
const MARGIN = 10
const FLIP_THRESHOLD = 340

function clampPos (x, y) {
  const w = typeof window !== 'undefined' ? window.innerWidth : 800
  const h = typeof window !== 'undefined' ? window.innerHeight : 600
  const maxX = Math.max(MARGIN, w - FAB - MARGIN)
  const maxY = Math.max(MARGIN, h - FAB - MARGIN)
  return {
    x: Math.min(Math.max(MARGIN, x), maxX),
    y: Math.min(Math.max(MARGIN, y), maxY)
  }
}

export default function FloatingAssistant () {
  const { showItemsAddedToast } = useAppShell()
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [ready, setReady] = useState(false)
  const [sessionId, setSessionId] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [pendingSuggestions, setPendingSuggestions] = useState(null)
  const [suggestionNonce, setSuggestionNonce] = useState(0)

  const dragRef = useRef({ active: false, startX: 0, startY: 0, ox: 0, oy: 0 })
  const movedRef = useRef(false)
  const panelRef = useRef(null)
  const lastFocusBeforePanelRef = useRef(null)

  useEffect(() => {
    let x = window.innerWidth - FAB - 24
    let y = window.innerHeight - FAB - 28
    try {
      const raw = localStorage.getItem(POS_KEY)
      if (raw) {
        const p = JSON.parse(raw)
        if (typeof p.x === 'number' && typeof p.y === 'number') {
          x = p.x
          y = p.y
        }
      }
    } catch (_) {}
    setPos(clampPos(x, y))
    setReady(true)
  }, [])

  const ensureSession = useCallback(async () => {
    let id = localStorage.getItem(SESS_KEY)
    if (id) {
      try {
        const { data } = await getSession(id)
        setSessionId(data._id)
        setMessages(data.messages || [])
        return data._id
      } catch (_) {
        localStorage.removeItem(SESS_KEY)
      }
    }
    const { data } = await createSession()
    localStorage.setItem(SESS_KEY, data._id)
    setSessionId(data._id)
    setMessages([])
    return data._id
  }, [])

  useEffect(() => {
    if (!open) return
    ensureSession()
  }, [open, ensureSession])

  const persistPos = useCallback((next) => {
    const c = clampPos(next.x, next.y)
    try {
      localStorage.setItem(POS_KEY, JSON.stringify(c))
    } catch (_) {}
    return c
  }, [])

  const onFabPointerDown = (e) => {
    if (e.button !== 0) return
    movedRef.current = false
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      ox: pos.x,
      oy: pos.y
    }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const onFabPointerMove = (e) => {
    if (!dragRef.current.active) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    if (Math.abs(dx) + Math.abs(dy) > 5) movedRef.current = true
    setPos(clampPos(dragRef.current.ox + dx, dragRef.current.oy + dy))
  }

  const onFabPointerUp = (e) => {
    if (!dragRef.current.active) return
    dragRef.current.active = false
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch (_) {}
    setPos(p => persistPos(p))
  }

  const toggleOpen = () => {
    if (movedRef.current) {
      movedRef.current = false
      return
    }
    setOpen(prev => {
      if (!prev) lastFocusBeforePanelRef.current = document.activeElement
      return !prev
    })
  }

  useEffect(() => {
    if (open) return
    const el = lastFocusBeforePanelRef.current
    lastFocusBeforePanelRef.current = null
    if (el && typeof el.focus === 'function') {
      requestAnimationFrame(() => {
        try {
          el.focus()
        } catch (_) {}
      })
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onEsc = (e) => {
      if (e.key !== 'Escape') return
      e.preventDefault()
      e.stopPropagation()
      setOpen(false)
    }
    document.addEventListener('keydown', onEsc, true)
    return () => document.removeEventListener('keydown', onEsc, true)
  }, [open])

  useEffect(() => {
    if (!open) return

    const selector =
      'button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled])'

    let panel = null
    let cancelled = false

    const onPanelKeyDown = (e) => {
      if (e.key !== 'Tab') return
      const p = panelRef.current
      if (!p) return
      const nodes = Array.from(p.querySelectorAll(selector)).filter(
        el => el.offsetParent !== null || el.getClientRects().length > 0
      )
      if (nodes.length === 0) return
      const first = nodes[0]
      const last = nodes[nodes.length - 1]
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else if (document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    const tid = setTimeout(() => {
      if (cancelled) return
      panel = panelRef.current
      if (!panel) return
      panel.addEventListener('keydown', onPanelKeyDown)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (cancelled) return
          const p = panelRef.current
          if (!p) return
          const focusable = Array.from(p.querySelectorAll(selector)).filter(
            el => el.offsetParent !== null || el.getClientRects().length > 0
          )
          const inp = p.querySelector('input.input, input:not([type="hidden"])')
          const start =
            inp && focusable.includes(inp) ? inp : focusable[0]
          start?.focus()
        })
      })
    }, 0)

    return () => {
      cancelled = true
      clearTimeout(tid)
      if (panel) panel.removeEventListener('keydown', onPanelKeyDown)
    }
  }, [open, sessionId, messages.length, pendingSuggestions, suggestionNonce])

  const handleSend = async () => {
    const msg = input.trim()
    if (!msg || !sessionId) return
    setInput('')
    setPendingSuggestions(null)
    setMessages(prev => [...prev, { role: 'user', content: msg }])
    setLoading(true)
    try {
      const { data } = await sendSessionMessage(sessionId, msg)
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
      if (hasSessionSuggestions(data.suggestions)) {
        setPendingSuggestions(data.suggestions)
        setSuggestionNonce(n => n + 1)
      }
    } catch (err) {
      console.error(err)
      setMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong. Try again.' }])
    }
    setLoading(false)
  }

  useEffect(() => {
    const onResize = () => setPos(p => clampPos(p.x, p.y))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  if (!ready) return null

  const panelW = Math.min(360, typeof window !== 'undefined' ? window.innerWidth - 24 : 360)
  const flipDown = pos.y < FLIP_THRESHOLD

  return (
    <div
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        zIndex: 9999,
        width: FAB,
        pointerEvents: 'none'
      }}
    >
      <AnimatePresence>
        {open && (
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Quick AI chat"
            initial={
              flipDown
                ? { opacity: 0, y: -12, scale: 0.96 }
                : { opacity: 0, y: 12, scale: 0.96 }
            }
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={
              flipDown
                ? { opacity: 0, y: -8, scale: 0.96 }
                : { opacity: 0, y: 8, scale: 0.96 }
            }
            transition={{ duration: 0.2 }}
            style={{
              position: 'absolute',
              right: 0,
              ...(flipDown
                ? { top: 'calc(100% + 12px)', bottom: 'auto' }
                : { bottom: 'calc(100% + 12px)', top: 'auto' }),
              width: panelW,
              maxHeight: 'min(480px, 62vh)',
              pointerEvents: 'auto',
              background: 'var(--surface)',
              borderRadius: '16px',
              border: '1px solid var(--border)',
              boxShadow: '0 12px 40px rgba(15,23,42,0.18)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            <div style={{
              padding: '0.65rem 0.85rem',
              borderBottom: '1px solid var(--surface-soft)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'linear-gradient(135deg, var(--accent), var(--purple))'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FiZap size={14} color="#fff" />
                <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.82rem' }}>Quick AI</span>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close"
                style={{
                  border: 'none', background: 'rgba(255,255,255,0.2)', borderRadius: 8,
                  cursor: 'pointer', padding: 6, display: 'flex', color: '#fff'
                }}>
                <FiX size={16} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '0.65rem 0.75rem', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {messages.length === 0 && (
                <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-subtle)', lineHeight: 1.5 }}>
                  Ask anything — add tasks, goals, notes, habits, or a daily plan. Confirm below when suggestions appear.
                </p>
              )}
              {messages.map((msg, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth: '88%',
                    padding: '0.5rem 0.7rem',
                    borderRadius: msg.role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                    background: msg.role === 'user' ? 'linear-gradient(135deg, var(--accent), var(--purple))' : 'var(--surface-muted)',
                    border: msg.role === 'assistant' ? '1px solid var(--border)' : 'none',
                    color: msg.role === 'user' ? '#fff' : 'var(--text-strong)',
                    fontSize: '0.8rem',
                    lineHeight: 1.55,
                    whiteSpace: 'pre-wrap'
                  }}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', color: 'var(--text-subtle)', fontSize: '0.75rem' }}>
                  <FiZap size={12} color="var(--accent)" /> Thinking…
                </div>
              )}
            </div>

            {pendingSuggestions && (
              <div style={{ padding: '0 0.65rem', pointerEvents: 'auto' }}>
                <SessionSuggestions
                  key={suggestionNonce}
                  suggestions={pendingSuggestions}
                  onDismiss={() => setPendingSuggestions(null)}
                  onApplied={(patch) => {
                    setPendingSuggestions(null)
                    showItemsAddedToast(patch)
                  }}
                />
              </div>
            )}

            <div style={{
              padding: '0.55rem 0.65rem',
              borderTop: '1px solid var(--surface-soft)',
              display: 'flex',
              gap: 8,
              alignItems: 'center',
              pointerEvents: 'auto'
            }}>
              <input
                className="input"
                placeholder="Message…"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                disabled={loading || !sessionId}
                style={{ flex: 1, fontSize: '0.82rem', padding: '0.45rem 0.65rem' }}
              />
              <button type="button" className="btn btn-primary" onClick={handleSend} disabled={loading || !sessionId}
                style={{ padding: '0.5rem 0.75rem', borderRadius: 10 }}>
                <FiSend size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        onPointerDown={onFabPointerDown}
        onPointerMove={onFabPointerMove}
        onPointerUp={onFabPointerUp}
        onPointerCancel={onFabPointerUp}
        onClick={toggleOpen}
        aria-label={open ? 'Close quick AI chat' : 'Open quick AI chat'}
        aria-expanded={open}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        style={{
          width: FAB,
          height: FAB,
          borderRadius: '50%',
          border: 'none',
          cursor: 'grab',
          pointerEvents: 'auto',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, var(--accent), var(--purple))',
          boxShadow: '0 6px 20px rgba(99,102,241,0.45)',
          color: '#fff'
        }}
      >
        {open ? <FiX size={22} /> : <FiMessageCircle size={22} />}
      </motion.button>
    </div>
  )
}
