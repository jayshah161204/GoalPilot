import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState
} from 'react'
import { FiX } from 'react-icons/fi'
import { deleteGoal, deleteTask, deleteNote, deleteHabit } from '../api'
import { APP_EVENTS } from '../utils/constants'

const AppShellContext = createContext(null)

export function useAppShell () {
  const ctx = useContext(AppShellContext)
  if (!ctx) {
    throw new Error('useAppShell must be used within AppShellProvider')
  }
  return ctx
}

export function AppShellProvider ({ children, navigateTo }) {
  const [toast, setToast] = useState(null)
  const toastRef = useRef(null)
  const undoTimerRef = useRef(null)
  const toastIdRef = useRef(0)

  useEffect(() => {
    toastRef.current = toast
  }, [toast])

  const clearUndoTimer = () => {
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current)
      undoTimerRef.current = null
    }
  }

  const dismissToast = useCallback(() => {
    clearUndoTimer()
    setToast(null)
  }, [])

  const showItemsAddedToast = useCallback(
    ({
      createdGoalIds = [],
      createdTaskIds = [],
      createdNoteIds = [],
      createdHabitIds = [],
      planTaskCount = 0
    }) => {
      const gc = createdGoalIds.length
      const tc = createdTaskIds.length
      const nc = createdNoteIds.length
      const hc = createdHabitIds.length
      if (gc === 0 && tc === 0 && nc === 0 && hc === 0) return

      clearUndoTimer()
      const id = ++toastIdRef.current
      const parts = []
      if (gc > 0) parts.push(`${gc} goal${gc === 1 ? '' : 's'}`)
      if (tc > 0) {
        const label = planTaskCount > 0 && planTaskCount === tc
          ? `daily plan item${tc === 1 ? '' : 's'}`
          : `task${tc === 1 ? '' : 's'}`
        parts.push(`${tc} ${label}`)
      }
      if (nc > 0) parts.push(`${nc} note${nc === 1 ? '' : 's'}`)
      if (hc > 0) parts.push(`${hc} habit${hc === 1 ? '' : 's'}`)

      setToast({
        id,
        message: `Added ${parts.join(', ').replace(/, ([^,]*)$/, ' and $1')}.`,
        snapshot: {
          goalIds: [...createdGoalIds],
          taskIds: [...createdTaskIds],
          noteIds: [...createdNoteIds],
          habitIds: [...createdHabitIds]
        },
        undoDisabled: false
      })

      undoTimerRef.current = setTimeout(() => {
        setToast(t => (t && t.id === id ? { ...t, undoDisabled: true } : t))
        undoTimerRef.current = null
      }, 10000)
    },
    []
  )

  const undoApply = useCallback(async () => {
    const t = toastRef.current
    if (!t || t.undoDisabled || !t.snapshot) return
    const snap = t.snapshot

    try {
      for (const id of snap.taskIds || []) {
        await deleteTask(id)
      }
      for (const id of snap.goalIds || []) {
        await deleteGoal(id)
      }
      for (const id of snap.noteIds || []) {
        await deleteNote(id)
      }
      for (const id of snap.habitIds || []) {
        await deleteHabit(id)
      }

      if (snap.taskIds?.length) window.dispatchEvent(new CustomEvent(APP_EVENTS.TASKS_UPDATED))
      if (snap.goalIds?.length) {
        window.dispatchEvent(new CustomEvent(APP_EVENTS.GOALS_UPDATED))
        window.dispatchEvent(new CustomEvent(APP_EVENTS.TASKS_UPDATED))
      }
      if (snap.noteIds?.length) window.dispatchEvent(new CustomEvent(APP_EVENTS.NOTES_UPDATED))
      if (snap.habitIds?.length) window.dispatchEvent(new CustomEvent(APP_EVENTS.HABITS_UPDATED))
    } catch (e) {
      console.error(e)
      window.alert('Undo failed. Some items may have already been removed.')
      return
    }
    dismissToast()
  }, [dismissToast])

  useEffect(() => () => clearUndoTimer(), [])

  const btn = {
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: '0.78rem',
    fontWeight: 600,
    padding: '0.35rem 0.65rem',
    fontFamily: 'Plus Jakarta Sans, Inter, sans-serif'
  }

  return (
    <AppShellContext.Provider
      value={{ navigateTo, showItemsAddedToast, dismissToast, undoApply }}
    >
      {children}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            zIndex: 10001,
            left: '50%',
            bottom: 96,
            transform: 'translateX(-50%)',
            maxWidth: 'min(440px, calc(100vw - 32px))',
            background: '#111827',
            color: 'var(--surface-muted)',
            borderRadius: 14,
            padding: '12px 14px',
            boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '8px 10px'
          }}
        >
          <span style={{ flex: '1 1 180px', fontSize: '0.84rem', lineHeight: 1.45 }}>
            {toast.message}
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            {!toast.undoDisabled && (
              <button
                type="button"
                onClick={undoApply}
                style={{
                  ...btn,
                  background: 'var(--amber-soft)',
                  color: 'var(--warning-text)'
                }}
              >
                Undo
              </button>
            )}
            {toast.snapshot.goalIds?.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  navigateTo('goals')
                  dismissToast()
                }}
                style={{
                  ...btn,
                  background: 'var(--accent-soft)',
                  color: 'var(--accent-strong)'
                }}
              >
                View goals
              </button>
            )}
            {toast.snapshot.taskIds?.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  navigateTo('tasks')
                  dismissToast()
                }}
                style={{
                  ...btn,
                  background: 'var(--success-soft)',
                  color: 'var(--success-text)'
                }}
              >
                View tasks
              </button>
            )}
            {toast.snapshot.noteIds?.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  navigateTo('notes')
                  dismissToast()
                }}
                style={{
                  ...btn,
                  background: 'var(--amber-soft)',
                  color: 'var(--warning-text)'
                }}
              >
                View notes
              </button>
            )}
            {toast.snapshot.habitIds?.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  navigateTo('habits')
                  dismissToast()
                }}
                style={{
                  ...btn,
                  background: 'var(--pink-soft)',
                  color: 'var(--pink-text)'
                }}
              >
                View habits
              </button>
            )}
            <button
              type="button"
              onClick={dismissToast}
              aria-label="Dismiss notification"
              style={{
                ...btn,
                background: 'transparent',
                color: 'var(--text-subtle)',
                padding: 6
              }}
            >
              <FiX size={18} />
            </button>
          </div>
        </div>
      )}
    </AppShellContext.Provider>
  )
}
