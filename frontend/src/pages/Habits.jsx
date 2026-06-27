import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiPlus, FiTrash2, FiZap, FiAward, FiX, FiActivity, FiBook, FiDroplet, FiMusic, FiSun, FiMoon, FiHeart, FiCode, FiPenTool, FiCoffee, FiBriefcase, FiSmile } from 'react-icons/fi'
import { getHabits, createHabit, toggleHabit, deleteHabit } from '../api'
import { APP_EVENTS } from '../utils/constants'

const COLORS = ['#6366F1', '#8B5CF6', '#EC4899', '#EF4444', '#F97316', '#EAB308', '#10B981', '#06B6D4']

const ICONS = [
  { id: 'activity', component: FiActivity },
  { id: 'book', component: FiBook },
  { id: 'droplet', component: FiDroplet },
  { id: 'music', component: FiMusic },
  { id: 'sun', component: FiSun },
  { id: 'moon', component: FiMoon },
  { id: 'heart', component: FiHeart },
  { id: 'code', component: FiCode },
  { id: 'pen', component: FiPenTool },
  { id: 'coffee', component: FiCoffee },
  { id: 'briefcase', component: FiBriefcase },
  { id: 'smile', component: FiSmile },
  { id: 'zap', component: FiZap },
]

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const toDateStr = (date) => date.toISOString().split('T')[0]

const getStreak = (completedDates) => {
  let streak = 0
  const today = new Date()
  for (let i = 0; i < 365; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    if (completedDates.includes(toDateStr(d))) streak++
    else break
  }
  return streak
}

const getLongestStreak = (completedDates) => {
  if (!completedDates.length) return 0
  const sorted = [...completedDates].sort()
  let longest = 1, current = 1
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1])
    const curr = new Date(sorted[i])
    const diff = (curr - prev) / (1000 * 60 * 60 * 24)
    if (diff === 1) { current++; longest = Math.max(longest, current) }
    else current = 1
  }
  return longest
}

const getLast365Days = () => {
  const days = []
  const today = new Date()
  for (let i = 364; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    days.push(toDateStr(d))
  }
  return days
}

function HabitIcon({ iconId, size = 16, color = 'var(--accent)' }) {
  const found = ICONS.find(i => i.id === iconId)
  const IconComp = found ? found.component : FiZap
  return <IconComp size={size} color={color} />
}

function Heatmap({ completedDates, color }) {
  const days = getLast365Days()
  const firstDayOfWeek = new Date(days[0]).getDay()
  const padded = [...Array(firstDayOfWeek).fill(null), ...days]
  const weeks = []
  for (let i = 0; i < padded.length; i += 7) weeks.push(padded.slice(i, i + 7))

  const monthLabels = {}
  weeks.forEach((week, wi) => {
    week.forEach(day => {
      if (day && new Date(day).getDate() === 1) {
        const m = new Date(day).getMonth()
        if (!Object.values(monthLabels).includes(MONTHS[m])) {
          monthLabels[wi] = MONTHS[m]
        }
      }
    })
  })

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ position: 'relative', minWidth: 'fit-content' }}>
        <div style={{ display: 'flex', marginBottom: '4px', marginLeft: '18px' }}>
          {weeks.map((_, wi) => (
            <div key={wi} style={{ width: 13, marginRight: 2, fontSize: '0.62rem', color: 'var(--text-subtle)', flexShrink: 0 }}>
              {monthLabels[wi] || ''}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 2 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginRight: 2 }}>
            {['S','M','T','W','T','F','S'].map((d, i) => (
              <div key={i} style={{ height: 11, fontSize: '0.58rem', color: 'var(--text-subtle)', lineHeight: '11px' }}>
                {i % 2 === 1 ? d : ''}
              </div>
            ))}
          </div>
          {weeks.map((week, wi) => (
            <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {week.map((day, di) => (
                <div key={di} title={day || ''} style={{
                  width: 11, height: 11, borderRadius: 2, flexShrink: 0,
                  background: !day ? 'transparent' : completedDates.includes(day) ? color : 'var(--border)',
                  opacity: !day ? 0 : 1,
                  transition: 'background 0.2s'
                }} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function AddHabitModal({ onClose, onAdd }) {
  const [name, setName] = useState('')
  const [iconId, setIconId] = useState('zap')
  const [color, setColor] = useState('#6366F1')
  const [loading, setLoading] = useState(false)

  const handleAdd = async () => {
    if (!name.trim()) return
    setLoading(true)
    await onAdd({ name: name.trim(), icon: iconId, color })
    setLoading(false)
    onClose()
  }

  const selectedIcon = ICONS.find(i => i.id === iconId)
  const SelectedIconComp = selectedIcon ? selectedIcon.component : FiZap

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        style={{ background: 'var(--surface)', borderRadius: '20px', padding: '1.75rem', width: '400px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)' }}>New Habit</h2>
          <button onClick={onClose} style={{ background: 'var(--surface-soft)', border: 'none', borderRadius: '8px', padding: '0.4rem', cursor: 'pointer', display: 'flex' }}><FiX size={16} /></button>
        </div>

        {/* Preview */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--surface-muted)', borderRadius: '12px', padding: '0.75rem 1rem', marginBottom: '1.25rem', border: '1px solid var(--border)' }}>
          <div style={{ width: 40, height: 40, borderRadius: '10px', background: `${color}15`, border: `1.5px solid ${color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <SelectedIconComp size={18} color={color} />
          </div>
          <p style={{ fontWeight: 700, fontSize: '0.95rem', color: name ? 'var(--text-primary)' : 'var(--text-subtle)' }}>
            {name || 'Habit name preview'}
          </p>
        </div>

        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Read 30 mins, Workout, Meditate"
          style={{ width: '100%', padding: '0.65rem 0.9rem', borderRadius: '10px', border: '1.5px solid var(--border)', fontSize: '0.88rem', fontFamily: 'Inter', outline: 'none', boxSizing: 'border-box', marginBottom: '1.25rem' }}
        />

        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.6rem', letterSpacing: '0.05em' }}>ICON</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1.25rem' }}>
          {ICONS.map(ic => {
            const IC = ic.component
            return (
              <button key={ic.id} onClick={() => setIconId(ic.id)}
                style={{
                  width: 36, height: 36, borderRadius: '8px',
                  border: `2px solid ${iconId === ic.id ? color : 'var(--border)'}`,
                  background: iconId === ic.id ? `${color}15` : 'var(--surface-muted)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s'
                }}>
                <IC size={15} color={iconId === ic.id ? color : 'var(--text-muted)'} />
              </button>
            )
          })}
        </div>

        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.6rem', letterSpacing: '0.05em' }}>COLOR</p>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {COLORS.map(c => (
            <button key={c} onClick={() => setColor(c)}
              style={{
                width: 28, height: 28, borderRadius: '50%', background: c,
                border: color === c ? '3px solid var(--text-primary)' : '3px solid transparent',
                cursor: 'pointer', transition: 'all 0.15s'
              }} />
          ))}
        </div>

        <button onClick={handleAdd} disabled={loading || !name.trim()}
          style={{
            width: '100%', padding: '0.75rem', background: color, border: 'none',
            borderRadius: '12px', color: '#fff', fontWeight: 700, fontSize: '0.9rem',
            fontFamily: 'Inter', cursor: name.trim() ? 'pointer' : 'not-allowed',
            opacity: !name.trim() ? 0.5 : 1, transition: 'opacity 0.15s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
          }}>
          <SelectedIconComp size={16} color="#fff" />
          {loading ? 'Adding...' : 'Add Habit'}
        </button>
      </motion.div>
    </div>
  )
}

export default function Habits() {
  const [habits, setHabits] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [error, setError] = useState('')
  const today = toDateStr(new Date())

  const fetchHabits = useCallback(async () => {
    setError('')
    try {
      const { data } = await getHabits()
      setHabits(data)
    } catch {
      setHabits([])
      setError('Failed to load habits. Please check your connection and try again.')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchHabits()
    const onUpdate = () => fetchHabits()
    window.addEventListener(APP_EVENTS.HABITS_UPDATED, onUpdate)
    return () => window.removeEventListener(APP_EVENTS.HABITS_UPDATED, onUpdate)
  }, [fetchHabits])

  const handleAdd = async (data) => {
    try {
      const { data: newHabit } = await createHabit(data)
      setHabits(prev => [newHabit, ...prev])
    } catch (e) {
      console.error('Failed to create habit:', e)
      setError('Could not create habit. Please try again.')
    }
  }

  const handleToggle = async (id) => {
    try {
      const { data: updated } = await toggleHabit(id, today)
      setHabits(prev => prev.map(h => h._id === id ? updated : h))
    } catch (e) {
      console.error('Failed to toggle habit:', e)
      setError('Could not update habit. Please try again.')
    }
  }

  const handleDelete = async (id) => {
    try {
      await deleteHabit(id)
      setHabits(prev => prev.filter(h => h._id !== id))
    } catch (e) {
      console.error('Failed to delete habit:', e)
      setError('Could not delete habit. Please try again.')
    }
  }

  const totalCompletedToday = habits.filter(h => h.completedDates.includes(today)).length

  return (
    <div style={{ paddingBottom: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: '0.2rem' }}>Habits</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.83rem' }}>
            {totalCompletedToday}/{habits.length} completed today
          </p>
        </div>
        <button onClick={() => setShowModal(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--accent)', border: 'none', borderRadius: '12px', padding: '0.65rem 1.1rem', color: '#fff', fontWeight: 700, fontSize: '0.85rem', fontFamily: 'Inter', cursor: 'pointer' }}>
          <FiPlus size={16} /> New Habit
        </button>
      </div>

      {error && (
        <div style={{ background: 'var(--danger-soft)', border: '1px solid var(--danger-border)', borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ color: 'var(--danger)', fontSize: '0.85rem', fontWeight: 600 }}>{error}</p>
          <button onClick={fetchHabits} style={{ background: 'var(--danger)', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.4rem 0.85rem', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, fontFamily: 'Inter', flexShrink: 0 }}>Retry</button>
        </div>
      )}

      {loading ? (
        <p style={{ color: 'var(--text-subtle)', fontSize: '0.85rem' }}>Loading...</p>
      ) : habits.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <div style={{ width: 56, height: 56, borderRadius: '16px', background: 'var(--accent-soft)', border: '1px solid var(--accent-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
            <FiZap size={24} color="var(--accent)" />
          </div>
          <p style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>No habits yet</p>
          <p style={{ color: 'var(--text-subtle)', fontSize: '0.85rem' }}>Add your first habit and start building streaks</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <AnimatePresence>
            {habits.map((habit, i) => {
              const streak = getStreak(habit.completedDates)
              const longest = getLongestStreak(habit.completedDates)
              const doneToday = habit.completedDates.includes(today)
              const totalDone = habit.completedDates.length

              return (
                <motion.div key={habit._id} className="card"
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }} transition={{ delay: i * 0.05 }}
                  style={{ margin: 0, borderLeft: `4px solid ${habit.color}` }}>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: 42, height: 42, borderRadius: '12px', background: `${habit.color}15`, border: `1.5px solid ${habit.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <HabitIcon iconId={habit.icon} size={18} color={habit.color} />
                      </div>
                      <div>
                        <p style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>{habit.name}</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>{totalDone} total completions</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <button onClick={() => handleToggle(habit._id)}
                        style={{
                          padding: '0.5rem 1rem', borderRadius: '10px',
                          border: `2px solid ${doneToday ? habit.color : 'var(--border)'}`,
                          background: doneToday ? habit.color : 'var(--surface)',
                          color: doneToday ? '#fff' : 'var(--text-muted)',
                          fontWeight: 700, fontSize: '0.8rem', fontFamily: 'Inter',
                          cursor: 'pointer', transition: 'all 0.2s'
                        }}>
                        {doneToday ? '✓ Done' : 'Mark Done'}
                      </button>
                      <button onClick={() => handleDelete(habit._id)}
                        style={{ background: 'var(--danger-soft)', border: '1px solid var(--danger-border)', borderRadius: '8px', padding: '0.5rem', cursor: 'pointer', display: 'flex', color: 'var(--danger)' }}>
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: streak > 0 ? 'var(--orange-soft)' : 'var(--surface-muted)', border: `1px solid ${streak > 0 ? 'var(--orange-border)' : 'var(--border)'}`, borderRadius: '8px', padding: '0.4rem 0.75rem' }}>
                      <FiZap size={13} color={streak > 0 ? 'var(--orange)' : 'var(--text-subtle)'} />
                      <span style={{ fontWeight: 800, fontSize: '0.88rem', color: streak > 0 ? 'var(--orange)' : 'var(--text-subtle)' }}>{streak}</span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-subtle)' }}>current streak</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--accent-soft-2)', border: '1px solid var(--purple-border)', borderRadius: '8px', padding: '0.4rem 0.75rem' }}>
                      <FiAward size={13} color="var(--purple)" />
                      <span style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--purple)' }}>{longest}</span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-subtle)' }}>longest streak</span>
                    </div>
                  </div>

                  <Heatmap completedDates={habit.completedDates} color={habit.color} />
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      {showModal && <AddHabitModal onClose={() => setShowModal(false)} onAdd={handleAdd} />}
    </div>
  )
}
