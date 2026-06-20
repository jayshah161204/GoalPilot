import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FiCheckSquare, FiTarget, FiZap, FiAward, FiAlertCircle, FiSun, FiTrendingUp, FiClock, FiRefreshCw, FiCalendar, FiBell } from 'react-icons/fi'
import { getTasks, getGoals, sendMessage, getInsights } from '../api'
import { APP_EVENTS } from '../utils/constants'

const dashboardMotivation = [
  // Core mindset
  "Start before you feel ready. Readiness often arrives after the first step.",
  "A slow day still counts when you refuse to stand still.",
  "Do the next useful thing. You do not need to solve your whole life today.",
  "Your future changes when your ordinary days change.",
  "One honest hour can rescue a day lost to procrastination.",
  "You are allowed to be tired. You are not required to give up.",
  "Make progress so small that your excuses cannot argue with it.",
  "The task feels heavier while you avoid it than while you do it.",
  "Your potential needs a routine, not another promise.",
  "Finish one thing today that tomorrow's you will be grateful for.",
  "Discipline is remembering what you want when comfort asks you to forget.",
  "A bad start can still become a strong finish.",
  "You do not need a perfect mood. You need a clear next step.",
  "Close one distraction. Complete one promise to yourself.",
  "Small work, repeated with patience, becomes a life people call lucky.",
  "Your pace is allowed to be different. Your direction still matters.",
  "Do not wait for confidence. Keep one promise to yourself and build it.",
  "The comeback begins quietly, usually with a task nobody applauds.",
  "You have survived difficult days before. Build something from this one.",
  "Progress is not always loud. Sometimes it is simply showing up again.",
  "One focused hour today can make tomorrow feel lighter.",
  "Start now. Momentum usually explains the rest of the route later.",
  "Big dreams still need one clear step today.",
  "Do not confuse being busy with moving forward.",
  "The life you want is hidden inside the work you keep postponing.",
  "You can restart the day at any hour.",
  "Consistency is self-respect practiced daily.",
  "Make today useful, not perfect.",
  "The version of you that you admire is built through ordinary choices.",
  "When motivation is missing, reduce the task, not the commitment.",
  "There is dignity in trying again without making a speech about it.",
  "Your first attempt does not need to impress anyone. It only needs to exist.",
  "Stop negotiating with the task. Give it ten focused minutes.",
  "Rest when you need it, then return without guilt.",
  "A focused mind can change what a frustrated mind calls impossible.",
  "Do not let one unproductive morning steal the entire day.",
  "Keep going until your habits become stronger than your excuses.",
  "Your work today is a vote for the person you want to become.",
  "The goal is not to feel unstoppable. The goal is to continue anyway.",
  "Nobody sees every effort, but every effort still changes you.",
  "Begin with what you have, from where you are, for just as long as you can.",
  "The next chapter needs your action, not your apology.",
  "You owe yourself the chance to discover how capable you can become.",
  // Family & personal drive
  "Give your parents another reason to celebrate you.",
  "Let the people who believed in you see what their faith helped build.",
  "Your family may not understand every struggle, but they will understand your effort.",
  "Make yourself proud first. The applause will find you later.",
  "Your parents do not need promises. They need proof.",
  "Somewhere your mother is telling someone you will make it. Do not let that be a lie.",
  "The sacrifices your family made deserve more than your excuses.",
  "One day your results will speak louder than every doubt anyone ever had.",
  // Student life & exams
  "Padhai does not need drama. Sit down and finish one chapter.",
  "Your competition is solving one more question right now.",
  "One focused hour today can save one regret after results.",
  "Marks reward the student who shows up when nobody is watching.",
  "The syllabus does not care about your mood. Start one topic anyway.",
  "Your rank will not improve by worrying. It will improve by working.",
  "Open the book. The first page is always the hardest one.",
  "You do not need to top the class. You need to beat yesterday's version of yourself.",
  "The semester will end whether you study or not. Choose wisely.",
  "Every topper you admire had days where they did not feel like studying either.",
  // Placement & career
  "The placement you want is behind the preparation you keep skipping.",
  "Nobody will hand you the career you want. Build it one skill at a time.",
  "Your resume is a receipt for the work you actually did, not the work you planned.",
  "The interview panel will not ask about your excuses. Prepare answers instead.",
  "Companies hire proof, not potential. Go create some proof today.",
  // Phone & distraction
  "Put the phone aside. Finish one task. Then decide whether to stop.",
  "Build a day you can respect when you put your phone down tonight.",
  "Instagram reels will not build your career. That textbook might.",
  "Every hour lost to scrolling is an hour borrowed from your future self.",
  "The notification can wait. Your deadline cannot.",
  "Screen time is the tax you pay on the life you could have lived.",
  // Resilience & grit
  "You are closer after one completed step than after a hundred perfect plans.",
  "A focused student with average talent will always beat a distracted genius.",
  "The struggle you are in today is building the strength you need for tomorrow.",
  "Failure is feedback. Adjust and go again.",
  "You are not behind. You are on your own timeline. But you still need to move.",
  "Do not compare your chapter one to someone else's chapter twenty.",
  "Hard work does not guarantee success, but no work guarantees nothing.",
  "The comfort zone is comfortable, but nothing grows there.",
]

function dateKey (value) {
  if (!value) return ''
  if (typeof value === 'string') return value.slice(0, 10)
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDateKey (key) {
  if (!key) return ''
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString()
}

const productiveWindows = [
  { id: 'early', label: 'Early Morning', range: '6-9 AM', startHour: 6, hours: [6, 7, 8] },
  { id: 'morning', label: 'Morning', range: '9 AM-12 PM', startHour: 9, hours: [9, 10, 11] },
  { id: 'afternoon', label: 'Afternoon', range: '12-4 PM', startHour: 12, hours: [12, 13, 14, 15] },
  { id: 'evening', label: 'Evening', range: '4-8 PM', startHour: 16, hours: [16, 17, 18, 19] },
  { id: 'night', label: 'Night', range: '8-11 PM', startHour: 20, hours: [20, 21, 22] }
]

const FOCUS_REMINDER_ENABLED_KEY = 'goalpilotFocusReminderEnabled'
const FOCUS_REMINDER_LAST_SENT_KEY = 'goalpilotFocusReminderLastSent'
const MIN_COMPLETIONS_FOR_PROFILE = 5
const RECENT_COMPLETION_DAYS = 30

function getProductivityProfile (tasks) {
  const buckets = productiveWindows.map(window => ({ ...window, count: 0 }))
  const now = new Date()
  const recentCutoff = new Date(now)
  recentCutoff.setDate(recentCutoff.getDate() - RECENT_COMPLETION_DAYS)
  const completed = tasks
    .filter(t => t.completed && t.completedAt)
    .map(t => ({ ...t, completedDate: new Date(t.completedAt) }))
    .filter(t => !Number.isNaN(t.completedDate.getTime()))
  const recentCompleted = completed.filter(t => t.completedDate >= recentCutoff)
  const sample = recentCompleted.length >= MIN_COMPLETIONS_FOR_PROFILE ? recentCompleted : completed

  sample.forEach(task => {
    const hour = task.completedDate.getHours()
    const bucket = buckets.find(item => item.hours.includes(hour))
    if (bucket) bucket.count += 1
  })

  const best = [...buckets].sort((a, b) => b.count - a.count)[0]
  if (sample.length < MIN_COMPLETIONS_FOR_PROFILE || !best?.count) {
    return {
      label: 'Building profile',
      id: 'building',
      range: 'Try 7-9 PM',
      startHour: 19,
      confidence: `${completed.length}/${MIN_COMPLETIONS_FOR_PROFILE} task completions logged. Check tasks off when you finish them for better timing.`,
      count: completed.length,
      confidenceLevel: 'Low'
    }
  }

  const share = Math.round((best.count / sample.length) * 100)
  const confidenceLevel = sample.length >= 12 && share >= 40 ? 'High' : sample.length >= 8 || share >= 35 ? 'Medium' : 'Low'
  const source = recentCompleted.length >= MIN_COMPLETIONS_FOR_PROFILE ? `last ${RECENT_COMPLETION_DAYS} days` : 'all-time history'

  return {
    label: best.label,
    id: best.id,
    range: best.range,
    startHour: best.startHour,
    confidence: `${confidenceLevel} confidence: ${best.count}/${sample.length} completions happened here from ${source}.`,
    count: best.count,
    confidenceLevel
  }
}

export default function Dashboard() {
  const [tasks, setTasks] = useState([])
  const [goals, setGoals] = useState([])
  const [motivation, setMotivation] = useState('')
  const [weeklyMsg, setWeeklyMsg] = useState('')
  const [loadingWeekly, setLoadingWeekly] = useState(false)
  const [insights, setInsights] = useState([])
  const [loadingInsights, setLoadingInsights] = useState(false)
  const [notifyStatus, setNotifyStatus] = useState('')
  const [focusReminderEnabled, setFocusReminderEnabled] = useState(() => localStorage.getItem(FOCUS_REMINDER_ENABLED_KEY) === 'true')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchData = async () => {
    setLoading(true)
    setError('')
    try {
      const [t, g] = await Promise.all([getTasks(), getGoals()])
      setTasks(t.data)
      setGoals(g.data)
      const random = dashboardMotivation[Math.floor(Math.random() * dashboardMotivation.length)]
      setMotivation(random)
    } catch {
      setError('Failed to load dashboard data. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    const onTasksUpdate = () => fetchData()
    const onGoalsUpdate = () => fetchData()
    window.addEventListener(APP_EVENTS.TASKS_UPDATED, onTasksUpdate)
    window.addEventListener(APP_EVENTS.GOALS_UPDATED, onGoalsUpdate)
    return () => {
      window.removeEventListener(APP_EVENTS.TASKS_UPDATED, onTasksUpdate)
      window.removeEventListener(APP_EVENTS.GOALS_UPDATED, onGoalsUpdate)
    }
  }, [])

  const generateMotivation = () => {
    const random = dashboardMotivation[Math.floor(Math.random() * dashboardMotivation.length)]
    setMotivation(random)
  }

  const generateWeekly = async () => {
    setLoadingWeekly(true)
    try {
      const { data } = await sendMessage("2 sentence weekly summary based on my tasks and goals. Direct.")
      setWeeklyMsg(data.reply)
    } catch { setWeeklyMsg("Keep pushing. Every task completed brings you closer.") }
    setLoadingWeekly(false)
  }

  const generateInsights = async () => {
    setLoadingInsights(true)
    try {
      const { data } = await getInsights()
      setInsights(data.insights)
    } catch { setInsights([]) }
    setLoadingInsights(false)
  }

  const completedTasks = tasks.filter(t => t.completed).length
  const pendingTasks = tasks.filter(t => !t.completed).length
  const todayKey = dateKey(new Date())
  const overdueTasks = tasks
    .filter(t => !t.completed && dateKey(t.dueDate) && dateKey(t.dueDate) < todayKey)
    .sort((a, b) => dateKey(a.dueDate).localeCompare(dateKey(b.dueDate)))
  const overdueGoals = goals
    .filter(g => !g.completed && dateKey(g.deadline) && dateKey(g.deadline) < todayKey)
    .sort((a, b) => dateKey(a.deadline).localeCompare(dateKey(b.deadline)))
  const todayFocus = tasks.filter(t => !t.completed).sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.priority] - { high: 0, medium: 1, low: 2 }[b.priority])).slice(0, 3)
  const upcomingTasks = tasks
    .filter(t => !t.completed && dateKey(t.dueDate) && dateKey(t.dueDate) >= todayKey)
    .sort((a, b) => dateKey(a.dueDate).localeCompare(dateKey(b.dueDate)))
    .slice(0, 3)
  const upcomingGoals = goals
    .filter(g => !g.completed && dateKey(g.deadline) && dateKey(g.deadline) >= todayKey)
    .sort((a, b) => dateKey(a.deadline).localeCompare(dateKey(b.deadline)))
    .slice(0, 3)
  const totalOverdue = overdueTasks.length + overdueGoals.length
  const avgGoalProgress = goals.length ? Math.round(goals.reduce((acc, g) => acc + g.progress, 0) / goals.length) : 0
  const completionRate = tasks.length ? Math.round((completedTasks / tasks.length) * 100) : 0
  const productivity = getProductivityProfile(tasks)

  const completedDates = tasks
    .filter(t => t.completed && t.completedAt)
    .map(t => new Date(t.completedAt).toDateString())
  const uniqueDates = [...new Set(completedDates)]
  let streak = 0
  const today = new Date()
  for (let i = 0; i < 30; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    if (uniqueDates.includes(d.toDateString())) streak++
    else break
  }

  useEffect(() => {
    if (!focusReminderEnabled || !('Notification' in window) || Notification.permission !== 'granted') return

    const checkFocusWindow = () => {
      const now = new Date()
      const target = new Date(now)
      target.setHours(productivity.startHour, 0, 0, 0)
      const reminderWindowEnd = new Date(target.getTime() + 30 * 60 * 1000)
      const sentKey = `${dateKey(now)}-${productivity.id || productivity.startHour}`

      if (now < target || now > reminderWindowEnd) return
      if (localStorage.getItem(FOCUS_REMINDER_LAST_SENT_KEY) === sentKey) return

      new Notification('GoalPilot productivity window', {
        body: `This is your ${productivity.label.toLowerCase()} productivity slot. Start one clear task now.`
      })
      localStorage.setItem(FOCUS_REMINDER_LAST_SENT_KEY, sentKey)
      setNotifyStatus(`Reminder sent for ${productivity.range}.`)
    }

    checkFocusWindow()
    const intervalId = window.setInterval(checkFocusWindow, 15000)
    window.addEventListener('focus', checkFocusWindow)
    document.addEventListener('visibilitychange', checkFocusWindow)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('focus', checkFocusWindow)
      document.removeEventListener('visibilitychange', checkFocusWindow)
    }
  }, [focusReminderEnabled, productivity.id, productivity.label, productivity.range, productivity.startHour])

  const enableFocusNotification = async () => {
    if (!('Notification' in window)) {
      setNotifyStatus('Notifications are not supported here.')
      return
    }

    const permission = Notification.permission === 'granted'
      ? 'granted'
      : await Notification.requestPermission()

    if (permission !== 'granted') {
      setNotifyStatus('Notifications are blocked.')
      return
    }

    localStorage.setItem(FOCUS_REMINDER_ENABLED_KEY, 'true')
    setFocusReminderEnabled(true)
    setNotifyStatus(`Reminder on for ${productivity.range}. Keep the dashboard open for browser notifications.`)
  }

  return (
    <div style={{ paddingBottom: '2rem' }}>
      {error && (
        <div style={{ background: 'var(--danger-soft)', border: '1px solid var(--danger-border)', borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ color: 'var(--danger)', fontSize: '0.85rem', fontWeight: 600 }}>{error}</p>
          <button onClick={fetchData} style={{ background: 'var(--danger)', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.4rem 0.85rem', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, fontFamily: 'Inter', flexShrink: 0 }}>Retry</button>
        </div>
      )}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <div style={{ width: 32, height: 32, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : error && tasks.length === 0 && goals.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600 }}>Unable to load your data</p>
          <p style={{ color: 'var(--text-subtle)', fontSize: '0.82rem', marginTop: '0.4rem' }}>Click Retry above or check if the backend server is running</p>
        </div>
      ) : (
      <>
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: '0.2rem' }}>
            Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.83rem' }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className={`streak-card ${streak > 0 ? 'active' : ''}`}>
          <div className="streak-icon"><FiZap size={17} /></div>
          <div>
            <p className="streak-value">{streak}</p>
            <p className="streak-label">day streak</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
        {[
          { label: 'Completed', value: completedTasks, icon: FiCheckSquare, color: 'var(--success)', bg: 'var(--success-soft)', border: 'var(--success-border)' },
          { label: 'Pending', value: pendingTasks, icon: FiClock, color: 'var(--warning)', bg: 'var(--warning-soft)', border: 'var(--warning-border)' },
          { label: 'Task Completion', value: `${completionRate}%`, icon: FiTrendingUp, color: 'var(--accent)', bg: 'var(--accent-soft)', border: 'var(--accent-border)' },
          { label: 'Goal Progress', value: `${avgGoalProgress}%`, icon: FiTarget, color: 'var(--purple)', bg: 'var(--accent-soft-2)', border: 'var(--purple-border)' },
        ].map((stat, i) => (
          <motion.div key={i} className="card"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}
          >
            <div style={{ width: 38, height: 38, borderRadius: '10px', background: stat.bg, border: `1px solid ${stat.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <stat.icon size={17} color={stat.color} />
            </div>
            <div>
              <p style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{stat.value}</p>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-secondary))', borderRadius: '16px', padding: '1rem 1.25rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <FiSun size={20} color="#fff" style={{ flexShrink: 0 }} />
        <p style={{ color: '#fff', fontWeight: 600, fontSize: '0.9rem', flex: 1, lineHeight: 1.5, fontStyle: 'italic' }}>
          "{motivation}"
        </p>
        <button onClick={generateMotivation}
          style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '8px', padding: '0.4rem 0.75rem', color: '#fff', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, fontFamily: 'Inter', flexShrink: 0 }}>
          Refresh
        </button>
      </motion.div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1rem' }}>
        <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} style={{ margin: 0 }}>
          <p style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FiZap color="var(--accent)" size={14} /> Today's Focus
          </p>
          {todayFocus.length === 0
            ? <p style={{ color: 'var(--text-subtle)', fontSize: '0.8rem' }}>All caught up</p>
            : todayFocus.map(task => (
              <div key={task._id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: task.priority === 'high' ? 'var(--danger)' : task.priority === 'medium' ? 'var(--warning)' : 'var(--success)' }} />
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</p>
                <span className={`badge badge-${task.priority}`} style={{ fontSize: '0.65rem' }}>{task.priority}</span>
              </div>
            ))
          }
        </motion.div>

        <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} style={{ margin: 0 }}>
          <p style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FiClock color="var(--accent)" size={14} /> Productivity Window
          </p>
          <p style={{ fontSize: '1rem', color: 'var(--text-strong)', fontWeight: 800, marginBottom: '0.2rem' }}>{productivity.range}</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', lineHeight: 1.5, marginBottom: '0.75rem' }}>{productivity.confidence}</p>
          <button
            onClick={enableFocusNotification}
            style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-border)', borderRadius: '8px', padding: '0.35rem 0.6rem', color: 'var(--accent)', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700, fontFamily: 'Inter', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
          >
            <FiBell size={11} /> {focusReminderEnabled ? 'Reminder on' : 'Notify me'}
          </button>
          {notifyStatus && <p style={{ color: 'var(--text-subtle)', fontSize: '0.68rem', marginTop: '0.45rem' }}>{notifyStatus}</p>}
        </motion.div>

        <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          style={{ margin: 0 }}>
          <p style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FiAlertCircle color="var(--danger)" size={14} /> Overdue
            {totalOverdue > 0 && <span style={{ marginLeft: 'auto', background: 'var(--danger-soft)', color: 'var(--danger)', padding: '0.1rem 0.5rem', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 700 }}>{totalOverdue}</span>}
          </p>
          {totalOverdue === 0
            ? <p style={{ color: 'var(--text-subtle)', fontSize: '0.8rem' }}>No overdue items</p>
            : <>
                {overdueGoals.map(goal => (
                  <div key={goal._id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <FiTarget size={11} color="var(--danger)" style={{ flexShrink: 0 }} />
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: '0.82rem', color: 'var(--danger)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{goal.title}</p>
                      <p style={{ fontSize: '0.72rem', color: 'var(--text-subtle)' }}>Goal · due {formatDateKey(dateKey(goal.deadline))}</p>
                    </div>
                  </div>
                ))}
                {overdueTasks.map(task => (
                  <div key={task._id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <FiCheckSquare size={11} color="var(--danger)" style={{ flexShrink: 0 }} />
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: '0.82rem', color: 'var(--danger)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</p>
                      <p style={{ fontSize: '0.72rem', color: 'var(--text-subtle)' }}>Task · due {formatDateKey(dateKey(task.dueDate))}</p>
                    </div>
                  </div>
                ))}
              </>
          }
        </motion.div>

        <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} style={{ margin: 0 }}>
          <p style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FiCalendar color="var(--warning)" size={14} /> Upcoming
          </p>
          {upcomingTasks.length === 0 && upcomingGoals.length === 0
            ? <p style={{ color: 'var(--text-subtle)', fontSize: '0.8rem' }}>No upcoming deadlines</p>
            : <>
                {upcomingGoals.map(goal => (
                  <div key={goal._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: 0, flex: 1 }}>
                      <FiTarget size={11} color="var(--warning)" style={{ flexShrink: 0 }} />
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{goal.title}</p>
                    </div>
                    <p style={{ fontSize: '0.72rem', color: 'var(--warning)', fontWeight: 600, flexShrink: 0, marginLeft: '0.5rem' }}>{formatDateKey(dateKey(goal.deadline))}</p>
                  </div>
                ))}
                {upcomingTasks.map(task => (
                  <div key={task._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{task.title}</p>
                    <p style={{ fontSize: '0.72rem', color: 'var(--warning)', fontWeight: 600 }}>{formatDateKey(dateKey(task.dueDate))}</p>
                  </div>
                ))}
              </>
          }
        </motion.div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} style={{ margin: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <p style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FiAward color="var(--accent)" size={14} /> Weekly Summary
            </p>
            <button onClick={generateWeekly} disabled={loadingWeekly}
              style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-border)', borderRadius: '8px', padding: '0.3rem 0.6rem', color: 'var(--accent)', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600, fontFamily: 'Inter', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <FiRefreshCw size={10} /> {loadingWeekly ? '...' : 'Generate'}
            </button>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.83rem', lineHeight: 1.7 }}>
            {weeklyMsg || 'Click Generate for your weekly summary'}
          </p>
        </motion.div>

        <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} style={{ margin: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <p style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FiTrendingUp color="var(--purple)" size={14} /> AI Insights
            </p>
            <button onClick={generateInsights} disabled={loadingInsights}
              style={{ background: 'var(--accent-soft-2)', border: '1px solid var(--purple-border)', borderRadius: '8px', padding: '0.3rem 0.6rem', color: 'var(--purple)', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600, fontFamily: 'Inter', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <FiRefreshCw size={10} /> {loadingInsights ? '...' : 'Generate'}
            </button>
          </div>
          {insights.length === 0
            ? <p style={{ color: 'var(--text-subtle)', fontSize: '0.8rem' }}>Click Generate for AI behavior insights</p>
            : insights.map((insight, i) => (
              <div key={i} style={{ display: 'flex', gap: '0.6rem', marginBottom: '0.5rem', alignItems: 'flex-start' }}>
                <div style={{ width: 20, height: 20, borderRadius: '6px', flexShrink: 0, background: ['var(--accent-soft)','var(--accent-soft-2)','var(--info-soft)','var(--success-soft)'][i % 4], border: `1px solid ${['var(--accent-border)','var(--purple-border)','var(--info-border)','var(--success-border)'][i % 4]}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FiTrendingUp size={11} color={['var(--accent)','var(--purple)','#0EA5E9','var(--success)'][i % 4]} />
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{insight}</p>
              </div>
            ))
          }
        </motion.div>
      </div>
      </>
      )}
    </div>
  )
}
