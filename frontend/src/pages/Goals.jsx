import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiTrash2, FiPlus, FiCheck, FiCalendar, FiAward, FiAlertCircle } from 'react-icons/fi'
import { getGoals, createGoal, deleteGoal, getTasks, createTask, updateTask, deleteTask } from '../api'
import { APP_EVENTS } from '../utils/constants'

const goalCompletionMessages = [
  "Proof that you follow through. Not everyone does.",
  "This one's done. The next one is waiting.",
  "You set it. You chased it. You finished it.",
  "Results don't lie. You delivered.",
  "One goal down. The journey continues.",
  "This is what consistency looks like.",
  "You said you would. You did. That's rare.",
  "Done. Now raise the bar.",
]

function CircularRing({ progress, completed }) {
  const size = 100
  const strokeWidth = 9
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (progress / 100) * circumference

  return (
    <svg width={size} height={size}>
      <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="var(--border)" strokeWidth={strokeWidth} />
      <motion.circle
        cx={size/2} cy={size/2} r={radius} fill="none"
        stroke={completed ? 'var(--success)' : 'url(#grad)'}
        strokeWidth={strokeWidth} strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
        transform={`rotate(-90 ${size/2} ${size/2})`}
      />
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--accent)" />
          <stop offset="100%" stopColor="var(--accent-secondary)" />
        </linearGradient>
      </defs>
      <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="middle"
        style={{ fontSize: '1rem', fontWeight: 800, fill: completed ? 'var(--success)' : 'var(--accent)', fontFamily: 'Inter' }}>
        {progress}%
      </text>
    </svg>
  )
}

export default function Goals() {
  const [goals, setGoals] = useState([])
  const [allTasks, setAllTasks] = useState([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [deadline, setDeadline] = useState('')
  const [expandedGoal, setExpandedGoal] = useState(null)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskPriority, setNewTaskPriority] = useState('medium')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchAll()
    const onGoalsUpdate = () => fetchAll()
    const onTasksUpdate = () => fetchAll()
    window.addEventListener(APP_EVENTS.GOALS_UPDATED, onGoalsUpdate)
    window.addEventListener(APP_EVENTS.TASKS_UPDATED, onTasksUpdate)
    return () => {
      window.removeEventListener(APP_EVENTS.GOALS_UPDATED, onGoalsUpdate)
      window.removeEventListener(APP_EVENTS.TASKS_UPDATED, onTasksUpdate)
    }
  }, [])

  const fetchAll = async () => {
    try {
      setLoading(true)
      setError('')
      const [g, t] = await Promise.all([getGoals(), getTasks()])
      setGoals(g.data)
      setAllTasks(t.data)
    } catch (err) {
      setError('Failed to load goals. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateGoal = async () => {
    if (!title.trim()) return
    try {
      await createGoal({ title, description, deadline })
      setTitle(''); setDescription(''); setDeadline('')
      fetchAll()
    } catch (err) {
      setError('Could not create goal. Please try again.')
    }
  }

  const handleDeleteGoal = async (id) => {
    try {
      await deleteGoal(id)
      setGoals(prev => prev.filter(g => g._id !== id))
    } catch (err) {
      setError('Could not delete goal. Please try again.')
    }
  }

  const handleAddTask = async (goalId) => {
    if (!newTaskTitle.trim()) return
    try {
      await createTask({ title: newTaskTitle, priority: newTaskPriority, goalId })
      setNewTaskTitle(''); setNewTaskPriority('medium')
      fetchAll()
    } catch (err) {
      setError('Could not add task to goal. Please try again.')
    }
  }

  const handleCompleteTask = async (taskId, completed) => {
    try {
      await updateTask(taskId, { completed: !completed })
      fetchAll()
    } catch (err) {
      setError('Could not update task. Please try again.')
    }
  }

  const handleDeleteTask = async (taskId) => {
    try {
      await deleteTask(taskId)
      setAllTasks(prev => prev.filter(t => t._id !== taskId))
    } catch (err) {
      setError('Could not delete task. Please try again.')
    }
  }

  const getGoalTasks = (goalId) =>
    allTasks
      .filter(t => t.goalId === goalId)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))

  const getCompletionMessage = (goalId) => {
    const index = goalId.charCodeAt(goalId.length - 1) % goalCompletionMessages.length
    return goalCompletionMessages[index]
  }

  return (
    <div>
      <h1 className="page-title">Goals</h1>

      {error && (
        <div style={{ background: 'var(--danger-soft)', border: '1px solid var(--danger-border)', borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ color: 'var(--danger)', fontSize: '0.85rem', fontWeight: 600 }}>{error}</p>
          <button onClick={fetchAll} style={{ background: 'var(--danger)', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.4rem 0.85rem', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, fontFamily: 'Inter', flexShrink: 0 }}>Retry</button>
        </div>
      )}

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <div style={{ width: 32, height: 32, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      )}

      <div className="card">
        <div className="form-row">
          <input className="input" placeholder="Goal title" value={title} onChange={e => setTitle(e.target.value)} />
          <input className="input" type="date" style={{ width: 'auto' }} value={deadline} onChange={e => setDeadline(e.target.value)} />
        </div>
        <div className="form-row">
          <input className="input" placeholder="Description (optional)" value={description} onChange={e => setDescription(e.target.value)} />
        </div>
        <button className="btn btn-primary" onClick={handleCreateGoal}><FiPlus size={16} /> Add Goal</button>
      </div>

      <AnimatePresence>
        {goals.map(goal => {
          const goalTasks = getGoalTasks(goal._id)
          const isExpanded = expandedGoal === goal._id
          const todayStr = new Date().toISOString().slice(0, 10)
          const deadlineStr = goal.deadline ? (typeof goal.deadline === 'string' ? goal.deadline.slice(0, 10) : new Date(goal.deadline).toISOString().slice(0, 10)) : ''
          const isOverdue = !goal.completed && deadlineStr && deadlineStr < todayStr

          return (
            <motion.div key={goal._id} className="card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="goal-card-layout">
                <div style={{ flexShrink: 0 }}>
                  <CircularRing progress={goal.progress} completed={goal.completed} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>{goal.title}</p>
                      {goal.description && <p style={{ color: 'var(--text-muted)', fontSize: '0.83rem', marginTop: '0.2rem' }}>{goal.description}</p>}
                      {goal.deadline && (
                        <p style={{ color: isOverdue ? 'var(--danger)' : 'var(--warning)', fontSize: '0.78rem', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          {isOverdue ? <FiAlertCircle size={11} /> : <FiCalendar size={11} />} {new Date(goal.deadline).toLocaleDateString()}
                          {isOverdue && <span style={{ background: 'var(--danger-soft)', color: 'var(--danger)', padding: '0.1rem 0.45rem', borderRadius: '20px', fontSize: '0.65rem', fontWeight: 700, marginLeft: '0.25rem', border: '1px solid var(--danger-border)' }}>Overdue</span>}
                        </p>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                      <button className="btn btn-primary"
                        onClick={() => setExpandedGoal(isExpanded ? null : goal._id)}
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}>
                        {isExpanded ? 'Hide' : `Tasks (${goalTasks.length})`}
                      </button>
                      <button className="btn btn-danger" onClick={() => handleDeleteGoal(goal._id)} style={{ padding: '0.35rem 0.6rem' }}>
                        <FiTrash2 size={13} />
                      </button>
                    </div>
                  </div>

                  <div style={{ background: 'var(--surface-soft)', borderRadius: '999px', height: 6, overflow: 'hidden' }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${goal.progress}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                      style={{ height: '100%', borderRadius: '999px', background: goal.completed ? 'var(--success)' : 'linear-gradient(90deg, var(--accent), var(--accent-secondary))' }}
                    />
                  </div>

                  {goal.completed && (
                    <div style={{
                      marginTop: '0.75rem', padding: '0.6rem 0.875rem',
                      background: 'var(--success-soft)', border: '1px solid var(--success-border)',
                      borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '0.5rem'
                    }}>
                      <FiAward size={14} color="var(--success)" style={{ flexShrink: 0 }} />
                      <p style={{ color: 'var(--success-text)', fontWeight: 600, fontSize: '0.82rem' }}>
                        {getCompletionMessage(goal._id)}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{ marginTop: '1rem', borderTop: '1px solid var(--surface-soft)', paddingTop: '1rem' }}
                  >
                    <p style={{ fontWeight: 600, fontSize: '0.78rem', color: 'var(--text-subtle)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {goalTasks.filter(t => t.completed).length}/{goalTasks.length} tasks completed
                    </p>

                    {goalTasks.map(task => (
                      <div key={task._id} style={{
                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                        padding: '0.6rem 0.75rem', borderRadius: '10px',
                        background: task.completed ? 'var(--success-soft)' : 'var(--surface-muted)',
                        border: `1px solid ${task.completed ? 'var(--success-border)' : 'var(--border)'}`,
                        marginBottom: '0.4rem'
                      }}>
                        <button onClick={() => handleCompleteTask(task._id, task.completed)}
                          style={{
                            width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                            background: task.completed ? 'var(--success)' : 'var(--surface)',
                            border: `2px solid ${task.completed ? 'var(--success)' : 'var(--border)'}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                          }}>
                          {task.completed && <FiCheck size={11} color="#fff" />}
                        </button>
                        <p style={{ flex: 1, fontSize: '0.85rem', color: task.completed ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: task.completed ? 'line-through' : 'none', fontWeight: 500 }}>{task.title}</p>
                        <span className={`badge badge-${task.priority}`}>{task.priority}</span>
                        <button onClick={() => handleDeleteTask(task._id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.4 }}
                          onMouseEnter={e => e.currentTarget.style.opacity = 1}
                          onMouseLeave={e => e.currentTarget.style.opacity = 0.4}>
                          <FiTrash2 size={12} color="var(--danger)" />
                        </button>
                      </div>
                    ))}

                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                      <input className="input" placeholder="Add a task..."
                        value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAddTask(goal._id)}
                        style={{ fontSize: '0.85rem' }} />
                      <select className="input" style={{ width: 'auto', fontSize: '0.85rem' }}
                        value={newTaskPriority} onChange={e => setNewTaskPriority(e.target.value)}>
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                      <button className="btn btn-primary" onClick={() => handleAddTask(goal._id)} style={{ padding: '0.5rem 0.75rem', flexShrink: 0 }}>
                        <FiPlus size={14} />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
