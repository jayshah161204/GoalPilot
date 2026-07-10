import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiRefreshCw, FiClock, FiZap, FiCheck, FiAlertCircle, FiCalendar, FiActivity } from 'react-icons/fi'
import { getDailyPlan, updateTask, toggleHabit } from '../api'
import { APP_EVENTS } from '../utils/constants'

// ─── localStorage (keyed by date — auto-resets every day) ────────────────────

const todayKey  = () => new Date().toISOString().slice(0, 10)
const PLAN_KEY  = () => `goalpilot_plan_${todayKey()}`
const SYNCED_KEY = () => `goalpilot_plan_synced_${todayKey()}`

function savePlan (plan, done) {
  try { localStorage.setItem(PLAN_KEY(), JSON.stringify({ plan, done: [...done] })) } catch {}
}
function loadPlan () {
  try {
    const raw = localStorage.getItem(PLAN_KEY())
    if (!raw) return null
    const p = JSON.parse(raw)
    return Array.isArray(p.plan) && p.plan.length > 0 ? p : null
  } catch { return null }
}
/** Was this plan already synced to the backend today? */
function wasSynced () {
  try { return localStorage.getItem(SYNCED_KEY()) === '1' } catch { return false }
}
function markSynced () {
  try { localStorage.setItem(SYNCED_KEY(), '1') } catch {}
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const PRIORITY = {
  high:   { badge: 'badge-high',   leftBar: '#EF4444' },
  medium: { badge: 'badge-medium', leftBar: '#D97706' },
  low:    { badge: 'badge-low',    leftBar: '#10B981' },
}
const TYPE_ICON = { habit: FiActivity, break: FiZap }

// ─── PlanItem component ───────────────────────────────────────────────────────

function PlanItem ({ item, index, done, onToggle }) {
  const p    = PRIORITY[item.priority] || PRIORITY.medium
  const Icon = TYPE_ICON[item.type]

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ delay: index * 0.055, duration: 0.22 }}
      onClick={onToggle}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: '0.875rem',
        padding: '0.9rem 1.1rem 0.9rem 1rem',
        background: done ? 'var(--surface-muted)' : 'var(--surface)',
        border: '1px solid var(--border)',
        borderLeft: `3px solid ${done ? 'var(--border)' : p.leftBar}`,
        borderRadius: '12px', marginBottom: '0.6rem',
        cursor: 'pointer',
        opacity: done ? 0.5 : 1,
        boxShadow: done ? 'none' : 'var(--shadow-card)',
        transition: 'all 0.18s',
      }}
    >
      {/* Circle check */}
      <div style={{
        width: 28, height: 28, borderRadius: '50%', flexShrink: 0, marginTop: '0.1rem',
        background: done ? 'var(--success)' : 'var(--accent-soft)',
        border: `2px solid ${done ? 'var(--success)' : 'var(--accent-border)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.18s',
      }}>
        {done
          ? <FiCheck size={13} color="#fff" />
          : <span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: '0.72rem' }}>{index + 1}</span>
        }
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.15rem', flexWrap: 'wrap' }}>
          {Icon && <Icon size={12} color="var(--text-subtle)" style={{ flexShrink: 0 }} />}
          <p style={{
            fontWeight: 600, fontSize: '0.88rem',
            color: done ? 'var(--text-subtle)' : 'var(--text-strong)',
            textDecoration: done ? 'line-through' : 'none',
            lineHeight: 1.35,
          }}>{item.task}</p>
          {(item.taskId || item.habitId) && (
            <span style={{
              fontSize: '0.62rem', fontWeight: 600,
              color: done ? 'var(--success-text)' : 'var(--text-subtle)',
              background: done ? 'var(--success-soft)' : 'var(--surface-muted)',
              border: `1px solid ${done ? 'var(--success-border)' : 'var(--border)'}`,
              borderRadius: '4px', padding: '0.05rem 0.35rem', flexShrink: 0,
            }}>{done ? 'done' : 'linked'}</span>
          )}
        </div>
        {item.reason && (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.77rem', lineHeight: 1.5 }}>{item.reason}</p>
        )}
      </div>

      {/* Right meta */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.28rem', flexShrink: 0 }}>
        {item.timeSlot && (
          <span style={{
            fontSize: '0.7rem', color: 'var(--accent)', fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 3,
            background: 'var(--accent-soft)', padding: '0.15rem 0.45rem',
            borderRadius: '6px', border: '1px solid var(--accent-border)',
          }}>
            <FiCalendar size={9} /> {item.timeSlot}
          </span>
        )}
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
          <FiClock size={10} /> {item.duration}
        </span>
        <span className={`badge ${p.badge}`} style={{ fontSize: '0.65rem' }}>{item.priority}</span>
      </div>
    </motion.div>
  )
}

// ─── Main Planner page ────────────────────────────────────────────────────────

export default function Planner () {
  const [plan, setPlan]           = useState([])
  const [meta, setMeta]           = useState(null)
  const [done, setDone]           = useState(new Set())
  const [syncing, setSyncing]     = useState(false)   // true while flushing to backend
  const [loading, setLoading]     = useState(false)
  const [generated, setGenerated] = useState(false)
  const [error, setError]         = useState('')
  const saveTimer                 = useRef(null)
  const hasFlushRun               = useRef(false)     // prevent double-flush in strict mode

  // ── Debounced persist ───────────────────────────────────────────────────────
  const persist = useCallback((currentPlan, currentDone) => {
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => savePlan(currentPlan, currentDone), 250)
  }, [])

  // ── Load plan ───────────────────────────────────────────────────────────────
  // force=true → always call AI (Regenerate button)
  // force=false → use cache if available (page visit / navigation)
  const fetchPlan = useCallback(async (force = false) => {
    if (!force) {
      const cached = loadPlan()
      if (cached) {
        setPlan(cached.plan)
        setDone(new Set(cached.done || []))
        setGenerated(true)
        hasFlushRun.current = wasSynced()
        return
      }
    }
    setLoading(true); setGenerated(false); setError('')
    setDone(new Set()); hasFlushRun.current = false
    try {
      const { data } = await getDailyPlan()
      const newPlan = data.plan || []
      setPlan(newPlan); setMeta(data.meta || null); setGenerated(true)
      persist(newPlan, new Set())
    } catch {
      setError('Could not generate your plan. Please try again.')
    } finally { setLoading(false) }
  }, [persist])

  useEffect(() => { fetchPlan(false) }, [fetchPlan])

  // ── Toggle a single item (local only) ──────────────────────────────────────
  const toggleDone = useCallback((i) => {
    setDone(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      persist(plan, next)
      return next
    })
  }, [plan, persist])

  // ── Flush to backend when ENTIRE plan is complete ──────────────────────────
  const flushToBackend = useCallback(async (currentPlan, currentDone) => {
    if (hasFlushRun.current) return   // already done today
    hasFlushRun.current = true
    setSyncing(true)

    const today = todayKey()
    const results = await Promise.allSettled(
      currentPlan.map(async (item, i) => {
        if (!currentDone.has(i)) return
        if (item.taskId) {
          await updateTask(item.taskId, { completed: true, completedAt: new Date().toISOString() })
        }
        if (item.habitId) {
          await toggleHabit(item.habitId, today)
        }
      })
    )

    const failed = results.filter(r => r.status === 'rejected').length
    if (failed > 0) {
      console.warn(`[Planner] ${failed} item(s) failed to sync — will retry next time`)
      hasFlushRun.current = false   // allow retry
    } else {
      markSynced()
      // Fire events so Tasks / Habits pages refresh when the user visits them
      window.dispatchEvent(new CustomEvent(APP_EVENTS.TASKS_UPDATED))
      window.dispatchEvent(new CustomEvent(APP_EVENTS.HABITS_UPDATED))
    }
    setSyncing(false)
  }, [])

  // Watch for plan completion → trigger flush
  useEffect(() => {
    if (plan.length > 0 && done.size === plan.length && !hasFlushRun.current) {
      flushToBackend(plan, done)
    }
  }, [done, plan, flushToBackend])

  const completed = done.size
  const total     = plan.length
  const pct       = total > 0 ? Math.round((completed / total) * 100) : 0
  const allDone   = total > 0 && completed === total
  const today     = new Date().toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div>
      {/* ── Header ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: '0.2rem' }}>Daily Plan</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.83rem' }}>{today}</p>
        </div>
        <button className="btn btn-primary" onClick={() => fetchPlan(true)} disabled={loading || syncing}>
          <FiRefreshCw size={14} style={{ animation: (loading || syncing) ? 'spin 0.8s linear infinite' : 'none' }} />
          {loading ? 'Generating...' : syncing ? 'Saving...' : generated ? 'Regenerate' : 'Generate'}
        </button>
      </div>

      {/* ── Error ──────────────────────────────────────────── */}
      {error && (
        <div style={{ background: 'var(--danger-soft)', border: '1px solid var(--danger-border)', borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ color: 'var(--danger)', fontSize: '0.83rem', fontWeight: 600 }}>{error}</p>
          <button onClick={() => fetchPlan(true)} className="btn btn-danger" style={{ padding: '0.3rem 0.7rem', fontSize: '0.78rem' }}>Retry</button>
        </div>
      )}

      {/* ── Skeleton ───────────────────────────────────────── */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <div style={{ height: 90, borderRadius: '16px', background: 'linear-gradient(135deg, var(--accent-soft), var(--accent-soft-2))', border: '1px solid var(--accent-border)', animation: 'pulse 1.5s infinite' }} />
          {[1,2,3,4,5].map(i => (
            <div key={i} className="card" style={{ height: 68, animation: `pulse 1.5s ${i*0.1}s infinite` }} />
          ))}
        </div>
      )}

      {/* ── Empty state ────────────────────────────────────── */}
      {!generated && !loading && !error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card"
          style={{ textAlign: 'center', padding: '3rem 2rem', background: 'linear-gradient(135deg, var(--accent-soft), var(--accent-soft-2))', border: '1px solid var(--accent-border)' }}>
          <div style={{ width: 48, height: 48, borderRadius: '14px', background: 'linear-gradient(135deg, var(--accent), var(--purple))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', boxShadow: '0 4px 14px rgba(99,102,241,0.25)' }}>
            <FiZap size={22} color="#fff" />
          </div>
          <p style={{ fontWeight: 700, color: 'var(--text-strong)', marginBottom: '0.4rem', fontSize: '1rem' }}>No plan yet</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.83rem', marginBottom: '1.5rem' }}>
            AI builds a focused schedule from your tasks, goals and habits.
          </p>
          <button className="btn btn-primary" onClick={() => fetchPlan(true)}>
            <FiZap size={14} /> Generate My Plan
          </button>
        </motion.div>
      )}

      {/* ── Plan ───────────────────────────────────────────── */}
      {generated && !loading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>

          {/* Overdue banner */}
          {meta?.overdueCount > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--danger-soft)', border: '1px solid var(--danger-border)', borderRadius: '10px', padding: '0.6rem 1rem', marginBottom: '0.75rem' }}>
              <FiAlertCircle size={14} color="var(--danger)" />
              <p style={{ color: 'var(--danger)', fontSize: '0.8rem', fontWeight: 600 }}>
                {meta.overdueCount} overdue task{meta.overdueCount > 1 ? 's' : ''} — prioritised first.
              </p>
            </div>
          )}

          {/* Summary banner */}
          <div style={{ background: 'linear-gradient(135deg, var(--accent-soft), var(--accent-soft-2))', border: '1px solid var(--accent-border)', borderRadius: '16px', padding: '1.1rem 1.25rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: total > 0 ? '0.75rem' : 0 }}>
              <div>
                <p style={{ fontWeight: 700, color: 'var(--accent)', fontSize: '0.95rem' }}>
                  {syncing
                    ? '⏳ Saving to your tasks & habits...'
                    : allDone && wasSynced()
                      ? '🎉 All done — tasks & habits updated!'
                      : allDone
                        ? '🎉 All done for today!'
                        : `${completed} of ${total} done`}
                </p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.76rem', marginTop: '0.15rem' }}>
                  {allDone
                    ? 'Completed items reflected across Tasks & Habits'
                    : 'Click any item to mark complete · progress saves automatically'}
                </p>
              </div>
              <button onClick={() => fetchPlan(true)} className="btn" disabled={syncing}
                style={{ background: 'var(--surface)', border: '1px solid var(--accent-border)', color: 'var(--accent)', fontSize: '0.78rem', padding: '0.4rem 0.8rem' }}>
                <FiRefreshCw size={12} style={{ animation: syncing ? 'spin 0.8s linear infinite' : 'none' }} />
                {syncing ? 'Saving...' : 'New plan'}
              </button>
            </div>

            {/* Progress bar */}
            {total > 0 && (
              <div>
                <div style={{ height: 5, background: 'var(--accent-border)', borderRadius: '99px', overflow: 'hidden' }}>
                  <motion.div
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.45, ease: 'easeOut' }}
                    style={{ height: '100%', background: 'linear-gradient(90deg, var(--accent), var(--purple))', borderRadius: '99px' }}
                  />
                </div>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-subtle)', marginTop: '0.3rem' }}>{pct}% complete</p>
              </div>
            )}
          </div>

          {/* Items */}
          <AnimatePresence>
            {plan.map((item, i) => (
              <PlanItem
                key={i} item={item} index={i}
                done={done.has(i)}
                onToggle={() => toggleDone(i)}
              />
            ))}
          </AnimatePresence>

          {/* All done card */}
          {allDone && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              style={{ textAlign: 'center', padding: '1.75rem', background: 'var(--success-soft)', border: '1px solid var(--success-border)', borderRadius: '14px', marginTop: '0.25rem' }}>
              {syncing
                ? <>
                    <FiRefreshCw size={24} color="var(--success)" style={{ animation: 'spin 0.8s linear infinite', marginBottom: '0.5rem' }} />
                    <p style={{ fontWeight: 700, color: 'var(--success-text)', fontSize: '0.92rem' }}>Updating your tasks & habits...</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.79rem', marginTop: '0.2rem' }}>Just a second.</p>
                  </>
                : <>
                    <p style={{ fontSize: '1.4rem', marginBottom: '0.35rem' }}>🎯</p>
                    <p style={{ fontWeight: 700, color: 'var(--success-text)', fontSize: '0.92rem' }}>Plan complete — well done!</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.79rem', marginTop: '0.2rem' }}>
                      All linked tasks and habits have been marked as done across the app.
                    </p>
                  </>
              }
            </motion.div>
          )}
        </motion.div>
      )}
    </div>
  )
}