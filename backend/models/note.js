const mongoose = require('mongoose')

/**
 * Note Schema
 *
 * Notes support pinning (pinned notes sort to top) and AI summarization.
 * The updatedAt field is managed by the { timestamps: true } option.
 */
const NoteSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Note must belong to a user']
  },
  title: {
    type: String,
    required: [true, 'Note title is required'],
    maxlength: [200, 'Title cannot exceed 200 characters'],
    trim: true
  },
  content: {
    type: String,
    default: '',
    maxlength: [10000, 'Content cannot exceed 10000 characters']
  },
  summary: { type: String, default: '' },
  pinned: { type: Boolean, default: false }
}, { timestamps: true })

// Notes are displayed sorted: pinned first, then by most recently updated
NoteSchema.index({ userId: 1, pinned: -1, updatedAt: -1 })

module.exports = mongoose.models.Note || mongoose.model('Note', NoteSchema)
