/**
 * SessionSuggestions.jsx
 *
 * Renders a confirmation panel below AI chat messages when the assistant
 * suggests adding OR modifying items.
 *
 * Supports two modes:
 *  1. ADDITIVE (default): Create new goals, tasks, notes, habits, daily plan items.
 *  2. ACTIONS: Delete or complete existing items (always requires explicit confirm).
 *
 * Nothing is saved or deleted until the user clicks "Confirm" on the specific panel.
 * This gives the user full control — the AI is an agent that *proposes*, not acts.
 */
import { useState, useEffect } from 'react'
import { FiCheckSquare, FiTarget, FiX, FiFileText, FiActivity, FiCalendar, FiTrash2, FiCheck, FiAlertTriangle } from 'react-icons/fi'
import { createGoal, createTask, createNote, createHabit, getGoals, deleteTask, updateTask, deleteGoal, deleteNote, deleteHabit } from '../api'
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
    <div>
      <p style={{ fontSize: '0.72rem', fontWeight: 600, color: iconColor || 'var(--accent)', margin: '0 0 0.35rem', display: 'flex', alignItems: 'center', gap: 6 }}>
        <Icon size={12} /> {label}
      </p>
      {children}
    </div>
  )
}

/** Checkbox list for additive suggestions */
function CheckboxList ({ items, picked, onToggle, renderLabel }) {
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {items.map((item, i) => (
        <li key={i} style={{ marginBottom: 6 }}>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <input type="checkbox" checked={picked.has(i)} onChange={() => onToggle(i)} style={{ marginTop: 3 }} />
            <span>{renderLabel(item)}</span>
          </label>
        </li>
      ))}
    </ul>
  )
}

/**
 * ActionConfirmCard — renders a single proposed destructive action (delete/complete)
 * with its own Confirm / Skip buttons.
 *
 * @param {{ action, onConfirm, onSkip }} props
 */
function ActionConfirmCard ({ action, onConfirm, onSkip, busy }) {
  const isDelete = action.type.startsWith('delete_')
  const isComplete = action.type === 'complete_task'

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

/**
 * Main SessionSuggestions component.
 * Rendered inside the chat/session page below each AI message that produced suggestions.
 */
export default function SessionSuggestions ({ suggestions, onDismiss, onApplied }) {
  const goals = suggestions?.goals ?? EMPTY
  const tasks = suggestions?.tasks ?? EMPTY
  const notes = suggestions?.notes ?? EMPTY
  const habits = suggestions?.habits ?? EMPTY
  const planTasks = suggestions?.planTasks ?? EMPTY
  const rawActions = suggestions?.actions ?? EMPTY

  const [pickG, setPickG] = useState(() => new Set(goals.map((_, i) => i)))
  const [pickT, setPickT] = useState(() => new Set(tasks.map((_, i) => i)))
  const [pickN, setPickN] = useState(() => new Set(notes.map((_, i) => i)))
  const [pickH, setPickH] = useState(() => new Set(habits.map((_, i) => i)))
  const [pickP, setPickP] = useState(() => new Set(planTasks.map((_, i) => i)))
  const [skippedActions, setSkippedActions] = useState(new Set())
  const [busyAction, setBusyAction] = useState(null)
  const [busyApply, setBusyApply] = useState(false)
  const [actionError, setActionError] = useState('')

  useEffect(() => {
    setPickG(new Set((suggestions?.goals ?? EMPTY).map((_, i) => i)))
    setPickT(new Set((suggestions?.tasks ?? EMPTY).map((_, i) => i)))
    setPickN(new Set((suggestions?.notes ?? EMPTY).map((_, i) => i)))
    setPickH(new Set((suggestions?.habits ?? EMPTY).map((_, i) => i)))
    setPickP(new Set((suggestions?.planTasks ?? EMPTY).map((_, i) => i)))
    setSkippedActions(new Set())
    setActionError('')
  }, [suggestions])

  const hasAdditive =
    goals.length > 0 ||
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

  /** Add all checked additive suggestions */
  const handleApply = async () => {
    const selectedGoals = goals.filter((_, i) => pickG.has(i))
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

  // Visible (non-skipped) actions — keep original indices for skip/confirm state
  const hasAdditiveItems = hasAdditive

  if (!hasSessionSuggestions(suggestions)) return null

  return (
    <div style={{
      borderRadius: '14px',
      border: '1px solid var(--accent-border)',
      background: 'linear-gradient(180deg, var(--accent-soft) 0%, var(--surface) 40%)',
      padding: '0.85rem 1rem',
      marginTop: '0.25rem',
      marginBottom: '0.5rem',
      boxShadow: '0 2px 12px rgba(99,102,241,0.12)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
        <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent-strong)' }}>
          GoalPilot suggests…
        </p>
        <button type="button" onClick={onDismiss} aria-label="Dismiss suggestions"
          style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 4, borderRadius: 8, color: 'var(--text-subtle)' }}>
          <FiX size={16} />
        </button>
      </div>

      {/* ── Destructive Actions (delete/complete) — each has its own confirm button ── */}
      {visibleActionEntries.length > 0 && (
        <div style={{ marginBottom: hasAdditiveItems ? '0.75rem' : 0 }}>
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

      {/* ── Additive suggestions — one batch confirm ── */}
      {hasAdditiveItems && (
        <>
          <p style={{ margin: '0 0 0.6rem', fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
            Nothing is saved until you click "Add selected". Uncheck anything you don't want.
          </p>

          {goals.length > 0 && (
            <div style={{ marginBottom: '0.55rem' }}>
              <Section icon={FiTarget} label="Goals">
                <CheckboxList items={goals} picked={pickG} onToggle={i => toggle(setPickG, i)}
                  renderLabel={g => (
                    <>
                      {g.title}
                      {g.deadline && <span style={{ color: 'var(--text-subtle)', fontSize: '0.72rem' }}> — due {g.deadline}</span>}
                    </>
                  )} />
              </Section>
            </div>
          )}

          {tasks.length > 0 && (
            <div style={{ marginBottom: '0.55rem' }}>
              <Section icon={FiCheckSquare} label="Tasks">
                <CheckboxList items={tasks} picked={pickT} onToggle={i => toggle(setPickT, i)}
                  renderLabel={t => (
                    <>
                      {t.title}
                      <span style={{ color: 'var(--text-subtle)', fontSize: '0.72rem' }}>
                        {t.priority && t.priority !== 'medium' ? ` — ${t.priority}` : ''}
                        {t.dueDate ? ` — due ${t.dueDate}` : ''}
                        {t.goalTitle ? ` — goal: ${t.goalTitle}` : ''}
                      </span>
                    </>
                  )} />
              </Section>
            </div>
          )}

          {notes.length > 0 && (
            <div style={{ marginBottom: '0.55rem' }}>
              <Section icon={FiFileText} label="Notes">
                <CheckboxList items={notes} picked={pickN} onToggle={i => toggle(setPickN, i)}
                  renderLabel={n => (
                    <>
                      {n.title}
                      <span style={{ color: 'var(--text-subtle)', fontSize: '0.72rem', display: 'block', marginTop: 2 }}>
                        {n.content.length > 80 ? `${n.content.slice(0, 80)}…` : n.content}
                      </span>
                    </>
                  )} />
              </Section>
            </div>
          )}

          {habits.length > 0 && (
            <div style={{ marginBottom: '0.55rem' }}>
              <Section icon={FiActivity} label="Habits">
                <CheckboxList items={habits} picked={pickH} onToggle={i => toggle(setPickH, i)}
                  renderLabel={h => h.name} />
              </Section>
            </div>
          )}

          {planTasks.length > 0 && (
            <div style={{ marginBottom: '0.65rem' }}>
              <Section icon={FiCalendar} label="Daily plan (add as today's tasks)">
                <CheckboxList items={planTasks} picked={pickP} onToggle={i => toggle(setPickP, i)}
                  renderLabel={p => (
                    <>
                      {p.title}
                      <span style={{ color: 'var(--text-subtle)', fontSize: '0.72rem' }}>
                        {p.priority && p.priority !== 'medium' ? ` — ${p.priority}` : ''}
                        {p.description ? ` — ${p.description}` : ''}
                      </span>
                    </>
                  )} />
              </Section>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
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
