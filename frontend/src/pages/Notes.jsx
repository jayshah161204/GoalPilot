import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiTrash2, FiZap, FiPlus, FiFileText } from 'react-icons/fi'
import { BsPin, BsPinFill } from 'react-icons/bs'
import { getNotes, createNote, summarizeNote, updateNote, deleteNote } from '../api'
import { APP_EVENTS } from '../utils/constants'

export default function Notes() {
  const [notes, setNotes] = useState([])
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(null)
  const [error, setError] = useState('')
  const [pageLoading, setPageLoading] = useState(true)

  const fetchNotes = useCallback(async () => {
    setPageLoading(true)
    setError('')
    try {
      const { data } = await getNotes()
      setNotes(data)
    } catch (err) {
      console.error('Failed to load notes:', err)
      setError('Failed to load notes. Please check your connection and try again.')
    } finally {
      setPageLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNotes()
    const onUpdate = () => fetchNotes()
    window.addEventListener(APP_EVENTS.NOTES_UPDATED, onUpdate)
    return () => window.removeEventListener(APP_EVENTS.NOTES_UPDATED, onUpdate)
  }, [fetchNotes])

  const handleCreate = async () => {
    if (!title.trim() || !content.trim()) return
    await createNote({ title, content })
    setTitle(''); setContent('')
    fetchNotes()
  }

  const handleSummarize = async (id) => {
    setLoading(id)
    try {
      await summarizeNote(id)
      await fetchNotes()
    } catch (err) {
      console.error('Summarize failed:', err)
      setError('Failed to summarize note. Please try again.')
    } finally {
      setLoading(null)
    }
  }

  const handleTogglePin = async (id, currentPinned) => {
    try {
      await updateNote(id, { pinned: !currentPinned })
      await fetchNotes()
    } catch (err) {
      console.error('Toggle pin failed:', err)
    }
  }

  const handleDelete = async (id) => {
    try {
      await deleteNote(id)
      setNotes(prev => prev.filter(n => n._id !== id))
    } catch (err) {
      console.error('Delete note failed:', err)
      setError('Could not delete note. Please try again.')
    }
  }

  return (
    <div>
      <h1 className="page-title">Notes</h1>
      {error && (
        <div style={{ background: 'var(--danger-soft)', border: '1px solid var(--danger-border)', borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ color: 'var(--danger)', fontSize: '0.85rem', fontWeight: 600 }}>{error}</p>
          <button onClick={fetchNotes} style={{ background: 'var(--danger)', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.4rem 0.85rem', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, fontFamily: 'Inter', flexShrink: 0 }}>Retry</button>
        </div>
      )}
      {pageLoading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <div style={{ width: 32, height: 32, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      )}
      <div className="card">
        <div className="form-row">
          <input className="input" placeholder="Note title" value={title} onChange={e => setTitle(e.target.value)} />
        </div>
        <div className="form-row">
          <textarea className="input" placeholder="Write your note here..." value={content} onChange={e => setContent(e.target.value)} rows={4} style={{ resize: 'vertical' }} />
        </div>
        <button className="btn btn-primary" onClick={handleCreate}><FiPlus size={15} /> Add Note</button>
      </div>

      <AnimatePresence>
        {notes.map(note => (
          <motion.div key={note._id} className="card"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -100 }}
            style={note.pinned ? {
              borderLeft: '3px solid var(--accent)',
              background: 'linear-gradient(135deg, rgba(99,102,241,0.04) 0%, rgba(255,255,255,0) 60%)'
            } : {}}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                  <p style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-strong)', margin: 0 }}>{note.title}</p>
                  {note.pinned && (
                    <span style={{
                      fontSize: '0.65rem',
                      fontWeight: 600,
                      color: 'var(--accent)',
                      background: 'var(--accent-soft)',
                      padding: '0.15rem 0.45rem',
                      borderRadius: '6px',
                      letterSpacing: '0.02em'
                    }}>PINNED</span>
                  )}
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.6, marginBottom: '0.75rem' }}>{note.content}</p>
                {note.summary && (
                  <div style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-border)', borderRadius: '10px', padding: '0.75rem 1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
                      <FiFileText size={12} color="var(--accent)" />
                      <p style={{ color: 'var(--accent)', fontSize: '0.75rem', fontWeight: 600 }}>AI Summary</p>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.6 }}>{note.summary}</p>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginLeft: '1rem', flexShrink: 0 }}>
                <button
                  className="btn"
                  onClick={() => handleTogglePin(note._id, note.pinned)}
                  title={note.pinned ? 'Unpin note' : 'Pin note'}
                  style={{
                    padding: '0.5rem 0.6rem',
                    background: note.pinned ? 'var(--accent-soft)' : 'transparent',
                    border: note.pinned ? '1px solid var(--accent-border)' : '1px solid var(--border)',
                    color: note.pinned ? 'var(--accent)' : 'var(--text-muted)',
                    cursor: 'pointer',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {note.pinned ? <BsPinFill size={14} /> : <BsPin size={14} />}
                </button>
                <button className="btn btn-primary" onClick={() => handleSummarize(note._id)} disabled={loading === note._id}
                  style={{ padding: '0.5rem 0.875rem', fontSize: '0.82rem' }}>
                  <FiZap size={13} /> {loading === note._id ? 'Summarizing...' : (note.summary ? 'Re-summarize' : 'Summarize')}
                </button>
                <button className="btn btn-danger" onClick={() => handleDelete(note._id)} style={{ padding: '0.5rem 0.6rem' }}>
                  <FiTrash2 size={13} />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}