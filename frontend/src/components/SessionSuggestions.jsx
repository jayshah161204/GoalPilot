/**
 * SessionSuggestions.jsx
 *
 * Renders a confirmation panel below AI chat messages when the assistant
 * suggests adding OR modifying items.
 *
 * Supports:
 *  1. ADDITIVE: Create new goals, tasks, notes, habits, daily plan items.
 *     Allows inline customization of priority (Low/Medium/High) and due date / deadline.
 *  2. ACTIONS: Delete or complete existing items (requires explicit confirm).
 */
import { useState, useEffect } from 'react'
import {
  FiCheckSquare, FiTarget, FiX, FiFileText, FiActivity, FiCalendar,
  FiTrash2, FiCheck, FiAlertTriangle, FiClock
} from 'react-icons/fi'
import {
  createGoal, createTask, createNote, createHabit, getGoals,
  deleteTask, updateTask, deleteGoal, deleteNote, deleteHabit
} from '../api'
import { APP_EVENTS } from '../utils/constants'

const EMPTY = []

/** Checks if a suggestions object has any items worth showing */
export function hasSessionSuggestions (suggestions) {
  if (!suggestions) return false
  return (
    (suggestions.goals?.length || 0) > 0 ||
    (suggestions.tasks?.length || 0) > 0 ||
    (suggestions.notes?.length || 0) > 0 ||
    (suggestions.habits?.length || 0) > 0 ||
    (suggestions.planTasks?.length || 0) > 0 ||
    (suggestions.actions?.length || 0) > 0
  )
}

/** Small labelled section header */
function Section ({ icon: Icon, label, iconColor, children }) {
  return (
    <div style={{ marginBottom: '0.65rem' }}>
      <p style={{ fontSize: '0.74rem', fontWeight: 700, color: iconColor || 'var(--accent)', margin: '0 0 0.4rem', display: 'flex', alignItems: 'center', gap: 6 }}>
        <Icon size={13} /> {label}
      </p>
      {children}
    </div>
  )
}

/**
 * ActionConfirmCard — renders a single proposed destructive action (delete/complete)
 */
function ActionConfirmCard ({ action, onConfirm, onSkip, busy }) {
  const isDelete = action.type.startsWith('delete_')

  const label = (() => {
    if (action.type === 'delete_task') return `Delete task: "${action.taskTitle}"`
    if (action.type === 'complete_task') return `Mark done: "${action.taskTitle}"`
    if (action.type === 'delete_goal') return `Delete goal: "${action.goalTitle}"`
    if (action.type === 'delete_note') return `Delete note: "${action.noteTitle}"`
    if (action.type === 'delete_habit') return `Delete habit: "${action.habitName}"`
    return 'Unknown action'
  })()

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '0.75rem',
      background: isDelete ? 'var(--danger-soft)' : 'var(--success-soft)',
      border: `1px solid ${isDelete ? 'var(--danger-border)' : 'var(--success-border)'}`,
      borderRadius: '10px',
      padding: '0.6rem 0.85rem',
      marginBottom: '0.45rem'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
        {isDelete
          ? <FiTrash2 size={13} color="var(--danger)" style={{ flexShrink: 0 }} />
          : <FiCheck size={13} color="var(--success)" style={{ flexShrink: 0 }} />
        }
        <span style={{
          fontSize: '0.8rem',
          color: isDelete ? 'var(--danger)' : 'var(--success)',
          fontWeight: 600,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {label}
        </span>
      </div>
      <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
        <button
          type="button"
          onClick={onSkip}
          disabled={busy}
          style={{
            fontSize: '0.75rem',
            padding: '0.3rem 0.65rem',
            borderRadius: '7px',
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            cursor: 'pointer',
            fontFamily: 'inherit',
            color: 'var(--text-muted)'
          }}
        >
          Skip
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          style={{
            fontSize: '0.75rem',
            padding: '0.3rem 0.65rem',
            borderRadius: '7px',
            border: 'none',
            background: isDelete ? 'var(--danger)' : 'var(--success)',
            color: '#fff',
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontWeight: 700
          }}
        >
          {busy ? '…' : 'Confirm'}
        </button>
      </div>
    </div>
  )
}

export default function SessionSuggestions ({ suggestions, onDismiss, onApplied }) {
  const goals = suggestions?.goals ?? EMPTY
  const rawTasks = suggestions?.tasks ?? EMPTY
  const notes = suggestions?.notes ?? EMPTY
  const habits = suggestions?.habits ?? EMPTY
  const rawPlanTasks = suggestions?.planTasks ?? EMPTY
  const rawActions = suggestions?.actions ?? EMPTY

  // Editable task state (priority & deadline customization)
  const [tasks, setTasks] = useState([])
  const [planTasks, setPlanTasks] = useState([])
  const [editableGoals, setEditableGoals] = useState([])

  const [pickG, setPickG] = useState(() => new Set(goals.map((_, i) => i)))
  const [pickT, setPickT] = useState(() => new Set(rawTasks.map((_, i) => i)))
  const [pickN, setPickN] = useState(() => new Set(notes.map((_, i) => i)))
  const [pickH, setPickH] = useState(() => new Set(habits.map((_, i) => i)))
  const [pickP, setPickP] = useState(() => new Set(rawPlanTasks.map((_, i) => i)))
  const [skippedActions, setSkippedActions] = useState(new Set())
  const [busyAction, setBusyAction] = useState(null)
  const [busyApply, setBusyApply] = useState(false)
  const [actionError, setActionError] = useState('')

  useEffect(() => {
    const initializedTasks = (suggestions?.tasks ?? EMPTY).map(t => ({
      title: t.title || '',
      priority: ['low', 'medium', 'high'].includes(t.priority) ? t.priority : 'medium',
      dueDate: t.dueDate ? t.dueDate.slice(0, 10) : '',
      goalTitle: t.goalTitle || '',
      description: t.description || ''
    }))
    setTasks(initializedTasks)
    setPickT(new Set(initializedTasks.map((_, i) => i)))

    const initializedPlan = (suggestions?.planTasks ?? EMPTY).map(p => ({
      title: p.title || '',
      priority: ['low', 'medium', 'high'].includes(p.priority) ? p.priority : 'medium',
      dueDate: p.dueDate ? p.dueDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
      description: p.description || ''
    }))
    setPlanTasks(initializedPlan)
    setPickP(new Set(initializedPlan.map((_, i) => i)))

    const initializedGoals = (suggestions?.goals ?? EMPTY).map(g => ({
      title: g.title || '',
      deadline: g.deadline ? g.deadline.slice(0, 10) : ''
    }))
    setEditableGoals(initializedGoals)
    setPickG(new Set(initializedGoals.map((_, i) => i)))

    setPickN(new Set((suggestions?.notes ?? EMPTY).map((_, i) => i)))
    setPickH(new Set((suggestions?.habits ?? EMPTY).map((_, i) => i)))
    setSkippedActions(new Set())
    setActionError('')
  }, [suggestions])

  const hasAdditive =
    editableGoals.length > 0 ||
    tasks.length > 0 ||
    notes.length > 0 ||
    habits.length > 0 ||
    planTasks.length > 0

  const visibleActionEntries = rawActions
    .map((action, idx) => ({ action, idx }))
    .filter(({ idx }) => !skippedActions.has(idx))

  useEffect(() => {
    if (!suggestions) return
    const allActionsHandled =
      rawActions.length === 0 || rawActions.every((_, i) => skippedActions.has(i))
    if (allActionsHandled && !hasAdditive) {
      onDismiss?.()
    }
  }, [skippedActions, hasAdditive, rawActions.length, suggestions, onDismiss])

  const toggle = (setter, i) => {
    setter(prev => {
      const n = new Set(prev)
      if (n.has(i)) n.delete(i)
      else n.add(i)
      return n
    })
  }

  const updateTaskItem = (index, field, val) => {
    setTasks(prev => {
      const copy = [...prev]
      copy[index] = { ...copy[index], [field]: val }
      return copy
    })
  }

  const updatePlanTaskItem = (index, field, val) => {
    setPlanTasks(prev => {
      const copy = [...prev]
      copy[index] = { ...copy[index], [field]: val }
      return copy
    })
  }

  const updateGoalDeadline = (index, val) => {
    setEditableGoals(prev => {
      const copy = [...prev]
      copy[index] = { ...copy[index], deadline: val }
      return copy
    })
  }

  /** Execute a single destructive action after the user confirms it */
  const handleAction = async (action, idx) => {
    setBusyAction(idx)
    setActionError('')
    try {
      if (action.type === 'delete_task' && action.taskId) {
        await deleteTask(action.taskId)
        window.dispatchEvent(new CustomEvent(APP_EVENTS.TASKS_UPDATED))
      } else if (action.type === 'complete_task' && action.taskId) {
        await updateTask(action.taskId, { completed: true })
        window.dispatchEvent(new CustomEvent(APP_EVENTS.TASKS_UPDATED))
      } else if (action.type === 'delete_goal' && action.goalId) {
        await deleteGoal(action.goalId)
        window.dispatchEvent(new CustomEvent(APP_EVENTS.GOALS_UPDATED))
        window.dispatchEvent(new CustomEvent(APP_EVENTS.TASKS_UPDATED))
      } else if (action.type === 'delete_note' && action.noteId) {
        await deleteNote(action.noteId)
        window.dispatchEvent(new CustomEvent(APP_EVENTS.NOTES_UPDATED))
      } else if (action.type === 'delete_habit' && action.habitId) {
        await deleteHabit(action.habitId)
        window.dispatchEvent(new CustomEvent(APP_EVENTS.HABITS_UPDATED))
      }
      setSkippedActions(prev => new Set([...prev, idx]))
    } catch (e) {
      console.error('[SessionSuggestions] Action failed:', e)
      setActionError(`Couldn't complete action — please try manually.`)
    } finally {
      setBusyAction(null)
    }
  }

  /** Add all checked additive suggestions with customized priority and deadlines */
  const handleApply = async () => {
    const selectedGoals = editableGoals.filter((_, i) => pickG.has(i))
    const selectedTasks = tasks.filter((_, i) => pickT.has(i))
    const selectedNotes = notes.filter((_, i) => pickN.has(i))
    const selectedHabits = habits.filter((_, i) => pickH.has(i))
    const selectedPlan = planTasks.filter((_, i) => pickP.has(i))
    const total = selectedGoals.length + selectedTasks.length + selectedNotes.length + selectedHabits.length + selectedPlan.length
    if (total === 0) return

    setBusyApply(true)
    try {
      const createdGoalIds = []
      const createdTaskIds = []
      const createdNoteIds = []
      const createdHabitIds = []
      const { data: existingGoals } = await getGoals()
      const titleToId = new Map()
      for (const g of existingGoals) {
        titleToId.set(String(g.title).trim().toLowerCase(), g._id)
      }

      for (const g of selectedGoals) {
        const payload = { title: g.title }
        if (g.deadline) payload.deadline = g.deadline
        const { data } = await createGoal(payload)
        createdGoalIds.push(data._id)
        titleToId.set(g.title.trim().toLowerCase(), data._id)
      }

      const addTask = async (t) => {
        const goalId = t.goalTitle
          ? (titleToId.get(String(t.goalTitle).trim().toLowerCase()) || null)
          : null
        const body = { title: t.title, priority: t.priority || 'medium' }
        if (t.dueDate) body.dueDate = t.dueDate
        if (t.description) body.description = t.description
        if (goalId) body.goalId = goalId
        const { data } = await createTask(body)
        createdTaskIds.push(data._id)
      }

      for (const t of selectedTasks) await addTask(t)
      for (const t of selectedPlan) await addTask(t)

      for (const n of selectedNotes) {
        const { data } = await createNote({ title: n.title, content: n.content })
        createdNoteIds.push(data._id)
      }

      for (const h of selectedHabits) {
        const { data } = await createHabit({ name: h.name, icon: h.icon || 'zap', color: h.color || '#6366F1' })
        createdHabitIds.push(data._id)
      }

      if (createdNoteIds.length > 0) window.dispatchEvent(new CustomEvent(APP_EVENTS.NOTES_UPDATED))
      if (createdHabitIds.length > 0) window.dispatchEvent(new CustomEvent(APP_EVENTS.HABITS_UPDATED))
      if (createdTaskIds.length > 0) window.dispatchEvent(new CustomEvent(APP_EVENTS.TASKS_UPDATED))
      if (createdGoalIds.length > 0) window.dispatchEvent(new CustomEvent(APP_EVENTS.GOALS_UPDATED))

      onApplied?.({ createdGoalIds, createdTaskIds, createdNoteIds, createdHabitIds, planTaskCount: selectedPlan.length })
    } catch (e) {
      console.error('[SessionSuggestions] Apply failed:', e)
      setActionError('Could not save some items. Please try again.')
    } finally {
      setBusyApply(false)
    }
  }

  if (!hasSessionSuggestions(suggestions)) return null

  return (
    <div style={{
      borderRadius: '14px',
      border: '1px solid var(--accent-border)',
      background: 'linear-gradient(180deg, var(--accent-soft) 0%, var(--surface) 40%)',
      padding: '0.85rem 1rem',
      marginTop: '0.25rem',
      marginBottom: '0.5rem',
      boxShadow: '0 4px 16px rgba(99,102,241,0.12)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
        <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent-strong)' }}>
          ⚡ Quick AI Task & Goal Suggestions
        </p>
        <button type="button" onClick={onDismiss} aria-label="Dismiss suggestions"
          style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 4, borderRadius: 8, color: 'var(--text-subtle)' }}>
          <FiX size={16} />
        </button>
      </div>

      {/* ── Destructive Actions (delete/complete) ── */}
      {visibleActionEntries.length > 0 && (
        <div style={{ marginBottom: hasAdditive ? '0.75rem' : 0 }}>
          <Section icon={FiAlertTriangle} label="Actions (confirm to apply)" iconColor="var(--orange)">
            {visibleActionEntries.map(({ action, idx }) => (
              <ActionConfirmCard
                key={idx}
                action={action}
                busy={busyAction === idx}
                onConfirm={() => handleAction(action, idx)}
                onSkip={() => setSkippedActions(prev => new Set([...prev, idx]))}
              />
            ))}
          </Section>
        </div>
      )}

      {/* ── Additive suggestions ── */}
      {hasAdditive && (
        <>
          <p style={{ margin: '0 0 0.65rem', fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
            Select items to add. You can customize the <strong>priority</strong> and <strong>deadline</strong> for each task before adding:
          </p>

          {/* ── Tasks with customizable priority and deadline ── */}
          {tasks.length > 0 && (
            <Section icon={FiCheckSquare} label="Suggested Tasks">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {tasks.map((task, i) => {
                  const isChecked = pickT.has(i)
                  return (
                    <div
                      key={i}
                      style={{
                        background: isChecked ? 'var(--surface)' : 'var(--surface-soft)',
                        border: `1px solid ${isChecked ? 'var(--accent-border)' : 'var(--border)'}`,
                        borderRadius: '10px',
                        padding: '0.6rem 0.75rem',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: isChecked ? 6 : 0 }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggle(setPickT, i)}
                          style={{ marginTop: 3, cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: isChecked ? 'var(--text-strong)' : 'var(--text-muted)', flex: 1 }}>
                          {task.title}
                          {task.goalTitle && (
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-subtle)', fontWeight: 400, marginLeft: 4 }}>
                              (Goal: {task.goalTitle})
                            </span>
                          )}
                        </span>
                      </div>

                      {isChecked && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '22px', flexWrap: 'wrap' }}>
                          {/* Priority Selector */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Priority:</span>
                            <select
                              value={task.priority}
                              onChange={(e) => updateTaskItem(i, 'priority', e.target.value)}
                              style={{
                                fontSize: '0.72rem',
                                padding: '2px 6px',
                                borderRadius: '6px',
                                border: '1px solid var(--border)',
                                background: 'var(--surface-muted)',
                                color: task.priority === 'high' ? 'var(--danger)' : task.priority === 'medium' ? 'var(--warning)' : 'var(--success)',
                                fontWeight: 700,
                                outline: 'none',
                                cursor: 'pointer'
                              }}
                            >
                              <option value="high">High</option>
                              <option value="medium">Medium</option>
                              <option value="low">Low</option>
                            </select>
                          </div>

                          {/* Deadline / Due Date Picker */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <FiClock size={11} color="var(--text-subtle)" />
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Due:</span>
                            <input
                              type="date"
                              value={task.dueDate}
                              onChange={(e) => updateTaskItem(i, 'dueDate', e.target.value)}
                              style={{
                                fontSize: '0.72rem',
                                padding: '2px 6px',
                                borderRadius: '6px',
                                border: '1px solid var(--border)',
                                background: 'var(--surface-muted)',
                                color: 'var(--text-primary)',
                                outline: 'none',
                                cursor: 'pointer'
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </Section>
          )}

          {/* ── Daily Plan Tasks ── */}
          {planTasks.length > 0 && (
            <Section icon={FiCalendar} label="Daily Plan Tasks">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {planTasks.map((plan, i) => {
                  const isChecked = pickP.has(i)
                  return (
                    <div
                      key={i}
                      style={{
                        background: isChecked ? 'var(--surface)' : 'var(--surface-soft)',
                        border: `1px solid ${isChecked ? 'var(--accent-border)' : 'var(--border)'}`,
                        borderRadius: '10px',
                        padding: '0.6rem 0.75rem',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: isChecked ? 6 : 0 }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggle(setPickP, i)}
                          style={{ marginTop: 3, cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: isChecked ? 'var(--text-strong)' : 'var(--text-muted)', flex: 1 }}>
                          {plan.title}
                          {plan.description && (
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-subtle)', fontWeight: 400, display: 'block', marginTop: 2 }}>
                              {plan.description}
                            </span>
                          )}
                        </span>
                      </div>

                      {isChecked && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '22px', flexWrap: 'wrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Priority:</span>
                            <select
                              value={plan.priority}
                              onChange={(e) => updatePlanTaskItem(i, 'priority', e.target.value)}
                              style={{
                                fontSize: '0.72rem',
                                padding: '2px 6px',
                                borderRadius: '6px',
                                border: '1px solid var(--border)',
                                background: 'var(--surface-muted)',
                                color: plan.priority === 'high' ? 'var(--danger)' : plan.priority === 'medium' ? 'var(--warning)' : 'var(--success)',
                                fontWeight: 700,
                                outline: 'none',
                                cursor: 'pointer'
                              }}
                            >
                              <option value="high">High</option>
                              <option value="medium">Medium</option>
                              <option value="low">Low</option>
                            </select>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <FiClock size={11} color="var(--text-subtle)" />
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Due:</span>
                            <input
                              type="date"
                              value={plan.dueDate}
                              onChange={(e) => updatePlanTaskItem(i, 'dueDate', e.target.value)}
                              style={{
                                fontSize: '0.72rem',
                                padding: '2px 6px',
                                borderRadius: '6px',
                                border: '1px solid var(--border)',
                                background: 'var(--surface-muted)',
                                color: 'var(--text-primary)',
                                outline: 'none',
                                cursor: 'pointer'
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </Section>
          )}

          {/* ── Goals ── */}
          {editableGoals.length > 0 && (
            <Section icon={FiTarget} label="Goals">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {editableGoals.map((g, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', flex: 1 }}>
                      <input type="checkbox" checked={pickG.has(i)} onChange={() => toggle(setPickG, i)} />
                      <span style={{ fontWeight: 600 }}>{g.title}</span>
                    </label>
                    {pickG.has(i) && (
                      <input
                        type="date"
                        value={g.deadline}
                        onChange={(e) => updateGoalDeadline(i, e.target.value)}
                        style={{ fontSize: '0.72rem', padding: '2px 6px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface-muted)', color: 'var(--text-primary)' }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* ── Notes ── */}
          {notes.length > 0 && (
            <Section icon={FiFileText} label="Notes">
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {notes.map((n, i) => (
                  <li key={i} style={{ marginBottom: 6 }}>
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      <input type="checkbox" checked={pickN.has(i)} onChange={() => toggle(setPickN, i)} style={{ marginTop: 3 }} />
                      <div>
                        <span style={{ fontWeight: 600 }}>{n.title}</span>
                        <span style={{ color: 'var(--text-subtle)', fontSize: '0.72rem', display: 'block', marginTop: 2 }}>
                          {n.content?.length > 80 ? `${n.content.slice(0, 80)}…` : n.content}
                        </span>
                      </div>
                    </label>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* ── Habits ── */}
          {habits.length > 0 && (
            <Section icon={FiActivity} label="Habits">
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {habits.map((h, i) => (
                  <li key={i} style={{ marginBottom: 6 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      <input type="checkbox" checked={pickH.has(i)} onChange={() => toggle(setPickH, i)} />
                      <span style={{ fontWeight: 600 }}>{h.name}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: '0.75rem' }}>
            <button type="button" onClick={onDismiss} disabled={busyApply}
              style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit', color: 'var(--text-muted)' }}>
              Dismiss
            </button>
            <button type="button" onClick={handleApply} disabled={busyApply}
              style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>
              {busyApply ? 'Saving…' : 'Add selected'}
            </button>
          </div>
        </>
      )}

      {actionError && (
        <p style={{ color: 'var(--danger)', fontSize: '0.78rem', marginTop: '0.5rem', marginBottom: 0 }}>
          ⚠ {actionError}
        </p>
      )}
    </div>
  )
}
