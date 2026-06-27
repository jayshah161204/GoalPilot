import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiTrash2, FiCheck, FiPlus, FiCalendar, FiAlertCircle } from 'react-icons/fi'
import { getTasks, createTask, updateTask, deleteTask } from '../api'
import { APP_EVENTS } from '../utils/constants'

export default function Tasks() {
  const [tasks, setTasks] = useState([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('medium')
  const [dueDate, setDueDate] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const todayStr = new Date().toISOString().slice(0, 10)
  const isOverdue = (task) => {
    if (task.completed || !task.dueDate) return false
    const dk = typeof task.dueDate === 'string' ? task.dueDate.slice(0, 10) : new Date(task.dueDate).toISOString().slice(0, 10)
    return dk && dk < todayStr
  }

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const { data } = await getTasks()
      setTasks(data)
    } catch {
      setError('Failed to load tasks. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTasks()
    const onUpdate = () => fetchTasks()
    window.addEventListener(APP_EVENTS.TASKS_UPDATED, onUpdate)
    return () => window.removeEventListener(APP_EVENTS.TASKS_UPDATED, onUpdate)
  }, [fetchTasks])

  const handleCreate = async () => {
    if (!title.trim()) return
    try {
      await createTask({ title, description, priority, dueDate })
      setTitle(''); setDescription(''); setDueDate('')
      fetchTasks()
    } catch (err) {
      setError('Could not create task. Please try again.')
    }
  }

  const handleComplete = async (id, completed) => {
    try {
      await updateTask(id, { completed: !completed })
      setTasks(prev => prev.map(t => t._id === id ? { ...t, completed: !completed } : t))
    } catch (err) {
      setError('Could not update task. Please try again.')
    }
  }

  const handleDelete = async (id) => {
    try {
      await deleteTask(id)
      setTasks(prev => prev.filter(t => t._id !== id))
    } catch (err) {
      setError('Could not delete task. Please try again.')
    }
  }

  return (
    <div>
      <h1 className="page-title">Tasks</h1>
      {error && (
        <div style={{ background: 'var(--danger-soft)', border: '1px solid var(--danger-border)', borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ color: 'var(--danger)', fontSize: '0.85rem', fontWeight: 600 }}>{error}</p>
          <button onClick={fetchTasks} style={{ background: 'var(--danger)', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.4rem 0.85rem', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, fontFamily: 'Inter', flexShrink: 0 }}>Retry</button>
        </div>
      )}
      <div className="card">
        <div className="form-row">
          <input className="input" placeholder="Task title" value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreate()} />
          <select className="input" style={{ width: 'auto' }} value={priority} onChange={e => setPriority(e.target.value)}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
        <div className="form-row">
          <input className="input" placeholder="Description (optional)" value={description} onChange={e => setDescription(e.target.value)} />
          <input className="input" type="date" style={{ width: 'auto' }} value={dueDate} onChange={e => setDueDate(e.target.value)} />
        </div>
        <button className="btn btn-primary" onClick={handleCreate}><FiPlus size={15} /> Add Task</button>
      </div>

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <div style={{ width: 32, height: 32, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      )}
      {!loading && <AnimatePresence>
        {tasks.map(task => (
          <motion.div key={task._id} className="card"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -100 }}
            style={{ borderLeft: `3px solid ${task.completed ? 'var(--accent-border)' : task.priority === 'high' ? 'var(--danger-border)' : task.priority === 'medium' ? 'var(--warning-border)' : 'var(--success-border)'}` }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                <button onClick={() => handleComplete(task._id, task.completed)}
                  style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                    background: task.completed ? 'var(--success)' : 'var(--surface)',
                    border: `2px solid ${task.completed ? 'var(--success)' : 'var(--border)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}>
                  {task.completed && <FiCheck size={13} color="#fff" />}
                </button>
                <div>
                  <p style={{ textDecoration: task.completed ? 'line-through' : 'none', color: task.completed ? 'var(--text-subtle)' : 'var(--text-strong)', fontWeight: 600, fontSize: '0.9rem' }}>
                    {task.title}
                  </p>
                  {task.description && <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.15rem' }}>{task.description}</p>}
                  <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span className={`badge badge-${task.priority}`}>{task.priority}</span>
                    {task.completed && <span className="badge badge-done">Completed</span>}
                    {task.dueDate && (
                      <span className={`badge ${isOverdue(task) ? 'badge-high' : 'badge-medium'}`} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        {isOverdue(task) ? <FiAlertCircle size={10} /> : <FiCalendar size={10} />} {new Date(task.dueDate).toLocaleDateString()}{isOverdue(task) ? ' · Overdue' : ''}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button className="btn btn-danger" onClick={() => handleDelete(task._id)} style={{ padding: '0.4rem 0.6rem' }}>
                <FiTrash2 size={14} />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>}
    </div>
  )
}
